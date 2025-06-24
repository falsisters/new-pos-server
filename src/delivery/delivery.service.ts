import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create.dto';
import { TransferService } from 'src/transfer/transfer.service';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private transferService: TransferService,
  ) {}

  // Helper function to convert UTC to Philippine time (UTC+8)
  private convertToPhilippineTime(utcDate: Date): Date {
    const philippineTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    return philippineTime;
  }

  async createDelivery(
    cashierId: string,
    createDeliveryDto: CreateDeliveryDto,
  ) {
    const { driverName, deliveryTimeStart, deliveryItem } = createDeliveryDto;

    return this.prisma.$transaction(
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
            deliveryTimeStart,
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
  }

  async editDelivery(
    cashierId: string, // This is the performing cashier's ID
    deliveryId: string,
    editDeliveryDto: CreateDeliveryDto, // Assuming CreateDeliveryDto is also used for edit
  ) {
    const { driverName, deliveryTimeStart, deliveryItem } = editDeliveryDto;

    return this.prisma.$transaction(
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
                stock: { decrement: item.quantity },
              },
            });
          }

          const perKiloPrice = await tx.perKiloPrice.findFirst({
            where: { productId: item.product.id },
          });

          if (perKiloPrice) {
            await this.transferService.transferDelivery(cashierId, {
              // Use cashierId here
              name: `${item.product.name} ${item.quantity}KG`,
              quantity: item.quantity,
            });
          }
        }

        // 2. Delete all existing delivery items
        await tx.deliveryItem.deleteMany({
          where: { deliveryId },
        });

        // 3. Update delivery basic info
        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            driverName,
            deliveryTimeStart,
          },
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
  }

  async deleteDelivery(deliveryId: string) {
    return this.prisma.delivery.delete({
      where: { id: deliveryId },
    });
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

    if (delivery) {
      return {
        ...delivery,
        createdAt: this.convertToPhilippineTime(delivery.createdAt),
        updatedAt: this.convertToPhilippineTime(delivery.updatedAt),
        deliveryTimeStart: delivery.deliveryTimeStart
          ? this.convertToPhilippineTime(delivery.deliveryTimeStart)
          : null,
      };
    }

    return delivery;
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

    return deliveries.map((delivery) => ({
      ...delivery,
      createdAt: this.convertToPhilippineTime(delivery.createdAt),
      updatedAt: this.convertToPhilippineTime(delivery.updatedAt),
      deliveryTimeStart: delivery.deliveryTimeStart
        ? this.convertToPhilippineTime(delivery.deliveryTimeStart)
        : null,
    }));
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

    return deliveries.map((delivery) => ({
      ...delivery,
      createdAt: this.convertToPhilippineTime(delivery.createdAt),
      updatedAt: this.convertToPhilippineTime(delivery.updatedAt),
      deliveryTimeStart: delivery.deliveryTimeStart
        ? this.convertToPhilippineTime(delivery.deliveryTimeStart)
        : null,
    }));
  }
}
