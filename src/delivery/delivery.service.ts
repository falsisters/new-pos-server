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

  async createDelivery(
    cashierId: string,
    createDeliveryDto: CreateDeliveryDto,
    userId: string,
  ) {
    const { driverName, deliveryTimeStart, deliveryItem } = createDeliveryDto;

    return this.prisma.$transaction(
      async (tx) => {
        for (const item of deliveryItem) {
          const currentProduct = await tx.product.findUnique({
            where: { id: item.id },
          });

          if (item.sackPrice) {
            await tx.sackPrice.update({
              where: { id: item.sackPrice.id },
              data: {
                stock: { increment: item.sackPrice.quantity },
              },
            });
          }

          if (item.perKiloPrice && currentProduct) {
            await this.transferService.transferDelivery(userId, {
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
              create: deliveryItem.map((item) => ({
                quantity: item.sackPrice
                  ? item.sackPrice.quantity
                  : item.perKiloPrice.quantity,
                product: { connect: { id: item.id } },
              })),
            },
          },
          include: {
            DeliveryItem: {
              include: {
                product: true,
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
    cashierId: string,
    deliveryId: string,
    editDeliveryDto: CreateDeliveryDto,
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
          // Create new delivery item
          await tx.deliveryItem.create({
            data: {
              quantity: item.sackPrice
                ? item.sackPrice.quantity
                : item.perKiloPrice.quantity,
              product: { connect: { id: item.id } },
              delivery: { connect: { id: deliveryId } },
            },
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
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        DeliveryItem: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getAllDeliveries(userId: string) {
    return this.prisma.delivery.findMany({
      where: {
        cashier: {
          userId,
        },
      },
      include: {
        DeliveryItem: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
