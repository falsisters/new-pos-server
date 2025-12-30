import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create.dto';
import { TransferService } from 'src/transfer/transfer.service';
import {
  formatDateForClient,
  createManilaDateFilter,
} from 'src/utils/date.util';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private transferService: TransferService,
  ) {}

  private formatDelivery(delivery: any) {
    if (!delivery) return null;
    return {
      ...delivery,
      createdAt: formatDateForClient(delivery.createdAt),
      updatedAt: formatDateForClient(delivery.updatedAt),
      deliveryTimeStart: formatDateForClient(delivery.deliveryTimeStart),
      DeliveryItem: delivery.DeliveryItem
        ? delivery.DeliveryItem.map((item) => ({
            ...item,
            createdAt: formatDateForClient(item.createdAt),
            updatedAt: formatDateForClient(item.updatedAt),
          }))
        : [],
    };
  }

  async createDelivery(
    cashierId: string,
    createDeliveryDto: CreateDeliveryDto,
  ) {
    const { driverName, deliveryTimeStart, deliveryItem } = createDeliveryDto;

    // Convert deliveryTimeStart from Manila Time to UTC for storage
    console.log(
      'Received deliveryTimeStart:',
      createDeliveryDto.deliveryTimeStart,
    );
    let utcDeliveryTimeStart: Date;

    if (deliveryTimeStart) {
      // Handle different date formats from client
      const dateString =
        typeof deliveryTimeStart === 'string'
          ? deliveryTimeStart
          : deliveryTimeStart.toString();

      // If it's already an ISO string with timezone info, use it directly
      if (
        dateString.includes('T') &&
        (dateString.includes('Z') || dateString.includes('+'))
      ) {
        utcDeliveryTimeStart = new Date(dateString);
      } else if (dateString.includes('T')) {
        // If it's ISO format but without timezone, assume it's Manila time
        utcDeliveryTimeStart = new Date(dateString + '+08:00');
      } else {
        // If it's just a date string, append time and timezone
        utcDeliveryTimeStart = new Date(`${dateString}T00:00:00+08:00`);
      }

      // Validate the parsed date
      if (isNaN(utcDeliveryTimeStart.getTime())) {
        throw new Error(`Invalid delivery date format: ${deliveryTimeStart}`);
      }
    } else {
      utcDeliveryTimeStart = new Date();
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        for (const item of deliveryItem) {
          // Verify that the product belongs to this cashier or is unassigned
          const currentProduct = await tx.product.findFirst({
            where: {
              id: item.id,
              OR: [
                { cashierId }, // Product belongs to this cashier
                { cashierId: null }, // Unassigned product (migration period)
              ],
            },
          });

          if (!currentProduct) {
            throw new Error(
              `Product ${item.id} not found or not accessible by this cashier`,
            );
          }

          // If product is unassigned, assign it to this cashier
          if (!currentProduct.cashierId) {
            await tx.product.update({
              where: { id: item.id },
              data: { cashierId },
            });
          }

          if (item.sackPrice) {
            await tx.sackPrice.update({
              where: { id: item.sackPrice.id },
              data: {
                stock: { increment: item.sackPrice.quantity },
              },
            });
          }

          if (item.perKiloPrice && currentProduct) {
            await this.transferService.transferDelivery(cashierId, {
              // Use cashierId here
              name: `${currentProduct.name} ${item.perKiloPrice.quantity}KG`,
              quantity: 0,
            });
          }
        }

        return tx.delivery.create({
          data: {
            driverName,
            deliveryTimeStart: utcDeliveryTimeStart,
            cashier: { connect: { id: cashierId } },
            DeliveryItem: {
              create: deliveryItem.map((item) => {
                const deliveryItemData: any = {
                  quantity: item.sackPrice
                    ? item.sackPrice.quantity
                    : item.perKiloPrice.quantity,
                  product: { connect: { id: item.id } },
                };
                if (item.sackPrice && item.sackPrice.id) {
                  deliveryItemData.SackPrice = {
                    connect: { id: item.sackPrice.id },
                  };
                }
                if (item.perKiloPrice && item.perKiloPrice.id) {
                  deliveryItemData.perKiloPrice = {
                    connect: { id: item.perKiloPrice.id },
                  };
                }
                return deliveryItemData;
              }),
            },
          },
          include: {
            DeliveryItem: {
              include: {
                product: true,
                SackPrice: true,
                perKiloPrice: true,
              },
            },
          },
        });
      },
      {
        timeout: 20000, // 20 seconds in milliseconds
      },
    );
    return this.formatDelivery(result);
  }

  async editDelivery(
    cashierId: string, // This is the performing cashier's ID
    deliveryId: string,
    editDeliveryDto: CreateDeliveryDto, // Assuming CreateDeliveryDto is also used for edit
  ) {
    const { driverName, deliveryTimeStart, deliveryItem } = editDeliveryDto;

    // Convert deliveryTimeStart from Manila Time to UTC for storage
    let utcDeliveryTimeStart: Date | undefined;

    if (deliveryTimeStart) {
      const dateString =
        typeof deliveryTimeStart === 'string'
          ? deliveryTimeStart
          : deliveryTimeStart.toString();

      // If it's already an ISO string with timezone info, use it directly
      if (
        dateString.includes('T') &&
        (dateString.includes('Z') || dateString.includes('+'))
      ) {
        utcDeliveryTimeStart = new Date(dateString);
      } else if (dateString.includes('T')) {
        // If it's ISO format but without timezone, assume it's Manila time
        utcDeliveryTimeStart = new Date(dateString + '+08:00');
      } else {
        // If it's just a date string, append time and timezone
        utcDeliveryTimeStart = new Date(`${dateString}T00:00:00+08:00`);
      }

      // Validate the parsed date
      if (isNaN(utcDeliveryTimeStart.getTime())) {
        throw new Error(`Invalid delivery date format: ${deliveryTimeStart}`);
      }
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Get current delivery items to decrement stock
        const currentDelivery = await tx.delivery.findUnique({
          where: { id: deliveryId },
          include: {
            DeliveryItem: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!currentDelivery) {
          throw new Error(`Delivery with id ${deliveryId} not found`);
        }

        // 1. Decrement the stock based on the original delivery items
        for (const item of currentDelivery.DeliveryItem) {
          // Get the sack price for the product
          const sackPrice = await tx.sackPrice.findFirst({
            where: { productId: item.product.id },
          });

          if (sackPrice) {
            await tx.sackPrice.update({
              where: { id: sackPrice.id },
              data: {
                stock: { decrement: Number(item.quantity) },
              },
            });
          }

          const perKiloPrice = await tx.perKiloPrice.findFirst({
            where: { productId: item.product.id },
          });

          if (perKiloPrice) {
            await this.transferService.transferDelivery(cashierId, {
              // Use cashierId here
              name: `${item.product.name} ${Number(item.quantity)}KG`,
              quantity: Number(item.quantity),
            });
          }
        }

        // 2. Delete all existing delivery items
        await tx.deliveryItem.deleteMany({
          where: { deliveryId },
        });

        // 3. Update delivery basic info
        const updateData: any = { driverName };
        if (utcDeliveryTimeStart) {
          updateData.deliveryTimeStart = utcDeliveryTimeStart;
        }

        await tx.delivery.update({
          where: { id: deliveryId },
          data: updateData,
        });

        // 4. Create new delivery items and increment stock
        for (const item of deliveryItem) {
          const newItemData: any = {
            quantity: item.sackPrice
              ? item.sackPrice.quantity
              : item.perKiloPrice.quantity,
            product: { connect: { id: item.id } },
            delivery: { connect: { id: deliveryId } },
          };

          if (item.sackPrice && item.sackPrice.id) {
            newItemData.SackPrice = { connect: { id: item.sackPrice.id } };
          }
          if (item.perKiloPrice && item.perKiloPrice.id) {
            newItemData.PerKiloPrice = {
              connect: { id: item.perKiloPrice.id },
            };
          }

          // Create new delivery item
          await tx.deliveryItem.create({
            data: newItemData,
          });

          // Increment stock with new quantities
          if (item.sackPrice) {
            await tx.sackPrice.update({
              where: { id: item.sackPrice.id },
              data: {
                stock: { increment: item.sackPrice.quantity },
              },
            });
          }

          // TODO: Handle perKiloPrice updates separately
        }

        // Return updated delivery
        return tx.delivery.findUnique({
          where: { id: deliveryId },
          include: {
            DeliveryItem: {
              include: {
                product: true,
                SackPrice: true,
                perKiloPrice: true,
              },
            },
          },
        });
      },
      {
        timeout: 20000, // 20 seconds in milliseconds
      },
    );
    return this.formatDelivery(result);
  }

  async deleteDelivery(deliveryId: string) {
    const delivery = await this.prisma.delivery.delete({
      where: { id: deliveryId },
    });
    return this.formatDelivery(delivery);
  }

  async getDelivery(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        DeliveryItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });

    return this.formatDelivery(delivery);
  }

  async getAllDeliveries(userId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        cashier: {
          userId,
        },
      },
      include: {
        DeliveryItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });

    return deliveries.map((delivery) => this.formatDelivery(delivery));
  }

  async getAllDeliveriesByCashier(cashierId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        cashierId,
      },
      include: {
        cashier: true,
        DeliveryItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return deliveries.map((delivery) => this.formatDelivery(delivery));
  }
}
