import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/createOrder.dto';
import { SaleService } from 'src/sale/sale.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async getOrderById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        OrderItem: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getAllOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: {
        customerId,
      },
      include: {
        customer: true,
        OrderItem: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    const { orderItem } = createOrderDto;

    return this.prisma.$transaction(async (tx) => {
      // Calculate total price by fetching prices for each item
      let totalPrice = 0;

      // Process each order item to calculate the total price
      for (const item of orderItem) {
        if (item.sackPriceId) {
          // Get sack price if specified
          const sackPrice = await tx.sackPrice.findUnique({
            where: { id: item.sackPriceId },
          });

          if (sackPrice) {
            totalPrice += sackPrice.price * item.quantity;
          }
        } else if (item.perKiloPriceId) {
          // Get per kilo price if specified
          const perKiloPrice = await tx.perKiloPrice.findUnique({
            where: { id: item.perKiloPriceId },
          });

          if (perKiloPrice) {
            totalPrice += perKiloPrice.price * item.quantity;
          }
        }
      }

      // Create the order with the calculated total price
      const order = await tx.order.create({
        data: {
          totalPrice,
          customer: {
            connect: { id: customerId },
          },
          OrderItem: {
            create: orderItem.map((item) => ({
              quantity: item.quantity,
              product: {
                connect: { id: item.productId },
              },
              sackPriceId: item.sackPriceId,
              perKiloPriceId: item.perKiloPriceId,
            })),
          },
        },
        include: {
          customer: true,
          OrderItem: {
            include: {
              product: true,
            },
          },
        },
      });

      return order;
    });
  }

  async editOrder(id: string, updateOrderDto: Partial<CreateOrderDto>) {
    const { orderItem } = updateOrderDto;

    return this.prisma.$transaction(async (tx) => {
      // Find the existing order
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: {
          OrderItem: true,
        },
      });

      if (!existingOrder) {
        throw new Error(`Order with ID ${id} not found`);
      }

      // Delete existing order items if we're updating them
      if (orderItem && orderItem.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // Calculate new total price
        let totalPrice = 0;

        // Process each order item to calculate the total price
        for (const item of orderItem) {
          if (item.sackPriceId) {
            // Get sack price if specified
            const sackPrice = await tx.sackPrice.findUnique({
              where: { id: item.sackPriceId },
            });

            if (sackPrice) {
              totalPrice += sackPrice.price * item.quantity;
            }
          } else if (item.perKiloPriceId) {
            // Get per kilo price if specified
            const perKiloPrice = await tx.perKiloPrice.findUnique({
              where: { id: item.perKiloPriceId },
            });

            if (perKiloPrice) {
              totalPrice += perKiloPrice.price * item.quantity;
            }
          }
        }

        // Update the order with new items and total price
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            totalPrice,
            OrderItem: {
              create: orderItem.map((item) => ({
                quantity: item.quantity,
                product: {
                  connect: { id: item.productId },
                },
                sackPriceId: item.sackPriceId,
                perKiloPriceId: item.perKiloPriceId,
              })),
            },
          },
          include: {
            customer: true,
            OrderItem: {
              include: {
                product: true,
              },
            },
          },
        });

        return updatedOrder;
      }

      // If no items to update, just return the existing order
      return existingOrder;
    });
  }

  async cancelOrder(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  async rejectOrder(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  async completeOrder(orderId: string, saleId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        sale: {
          connect: { id: saleId },
        },
      },
    });
  }
}
