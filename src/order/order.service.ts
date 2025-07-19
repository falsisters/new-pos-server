import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/createOrder.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // Helper function to convert UTC to Philippine time (UTC+8)
  private convertToPhilippineTime(utcDate: Date): Date {
    if (!utcDate) return null;
    const philippineTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    return philippineTime;
  }

  private formatOrder(order: any) {
    if (!order) return null;
    return {
      ...order,
      createdAt: this.convertToPhilippineTime(order.createdAt),
      updatedAt: this.convertToPhilippineTime(order.updatedAt),
      customer: order.customer
        ? {
            ...order.customer,
            createdAt: this.convertToPhilippineTime(order.customer.createdAt),
            updatedAt: this.convertToPhilippineTime(order.customer.updatedAt),
          }
        : null,
      OrderItem: order.OrderItem
        ? order.OrderItem.map((item) => ({
            ...item,
            createdAt: this.convertToPhilippineTime(item.createdAt),
            updatedAt: this.convertToPhilippineTime(item.updatedAt),
          }))
        : [],
    };
  }

  private formatOrders(orders: any[]) {
    return orders.map((order) => this.formatOrder(order));
  }

  async getOrderById(id: string) {
    const result = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        cashier: {
          select: {
            id: true,
            name: true,
          },
        },
        OrderItem: {
          include: {
            SackPrice: true,
            perKiloPrice: true,
            product: true,
          },
        },
      },
    });
    return this.formatOrder(result);
  }

  async getAllOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        customerId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        cashier: {
          select: {
            id: true,
            name: true,
          },
        },
        OrderItem: {
          include: {
            SackPrice: true,
            perKiloPrice: true,
            product: true,
          },
        },
      },
    });
    return this.formatOrders(orders);
  }

  // New method to get products available for orders from a specific cashier
  async getAvailableProductsForOrderByCashier(cashierId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        cashierId,
        OR: [
          {
            SackPrice: {
              some: {
                stock: {
                  gt: 0,
                },
              },
            },
          },
          {
            perKiloPrice: {
              stock: {
                gt: 0,
              },
            },
          },
        ],
      },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
          where: {
            stock: {
              gt: 0,
            },
          },
        },
        perKiloPrice: {
          where: {
            stock: {
              gt: 0,
            },
          },
        },
        cashier: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    return products.map((product) => ({
      ...product,
      createdAt: this.convertToPhilippineTime(product.createdAt),
      updatedAt: this.convertToPhilippineTime(product.updatedAt),
    }));
  }

  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    const { orderItem, cashierId } = createOrderDto;

    return this.prisma.$transaction(
      async (tx) => {
        // Calculate total price based on order items
        let totalPrice = 0;

        // Verify that all products exist and calculate total
        for (const item of orderItem) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              SackPrice: true,
              perKiloPrice: true,
            },
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          // Check stock and calculate price
          if (item.sackPriceId) {
            const sackPrice = await tx.sackPrice.findFirst({
              where: {
                id: item.sackPriceId,
                productId: item.productId,
                stock: {
                  gte: item.quantity,
                },
              },
              include: {
                specialPrice: true,
              },
            });

            if (!sackPrice) {
              throw new Error(`Insufficient stock for ${product.name} (sack)`);
            }

            // Calculate price (use special price if applicable and quantity meets minimum)
            const price =
              item.isSpecialPrice &&
              sackPrice.specialPrice &&
              item.quantity >= sackPrice.specialPrice.minimumQty
                ? sackPrice.specialPrice.price
                : sackPrice.price;

            totalPrice += price * item.quantity;
          }

          if (item.perKiloPriceId) {
            const perKiloPrice = await tx.perKiloPrice.findFirst({
              where: {
                id: item.perKiloPriceId,
                productId: item.productId,
                stock: {
                  gte: item.quantity,
                },
              },
            });

            if (!perKiloPrice) {
              throw new Error(
                `Insufficient stock for ${product.name} (per kilo)`,
              );
            }

            totalPrice += perKiloPrice.price * item.quantity;
          }
        }

        // Create the order
        return tx.order.create({
          data: {
            totalPrice,
            customer: { connect: { id: customerId } },
            user: { connect: { id: createOrderDto.userId } },
            ...(cashierId && { cashier: { connect: { id: cashierId } } }), // Add cashier if provided
            OrderItem: {
              create: orderItem.map((item) => ({
                quantity: item.quantity,
                product: { connect: { id: item.productId } },
                isSpecialPrice: item.isSpecialPrice || false,
                ...(item.sackPriceId && {
                  SackPrice: { connect: { id: item.sackPriceId } },
                }),
                ...(item.perKiloPriceId && {
                  perKiloPrice: { connect: { id: item.perKiloPriceId } },
                }),
              })),
            },
          },
          include: {
            OrderItem: {
              include: {
                product: true,
                SackPrice: {
                  include: {
                    specialPrice: true,
                  },
                },
                perKiloPrice: true,
              },
            },
            customer: true,
            cashier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      },
      {
        timeout: 20000,
      },
    );
  }

  async editOrder(id: string, updateOrderDto: Partial<CreateOrderDto>) {
    const { orderItem } = updateOrderDto;

    if (!orderItem) {
      throw new Error('Order items are required for update');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Get the existing order
        const existingOrder = await tx.order.findUnique({
          where: { id },
        });

        if (!existingOrder) {
          throw new Error('Order not found');
        }

        // Calculate new total price
        let totalPrice = 0;

        // Verify that all products exist and calculate total
        for (const item of orderItem) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              SackPrice: true,
              perKiloPrice: true,
            },
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          // Check stock and calculate price
          if (item.sackPriceId) {
            const sackPrice = await tx.sackPrice.findFirst({
              where: {
                id: item.sackPriceId,
                productId: item.productId,
                stock: {
                  gte: item.quantity,
                },
              },
              include: {
                specialPrice: true,
              },
            });

            if (!sackPrice) {
              throw new Error(`Insufficient stock for ${product.name} (sack)`);
            }

            // Calculate price (use special price if applicable and quantity meets minimum)
            const price =
              item.isSpecialPrice &&
              sackPrice.specialPrice &&
              item.quantity >= sackPrice.specialPrice.minimumQty
                ? sackPrice.specialPrice.price
                : sackPrice.price;

            totalPrice += price * item.quantity;
          }

          if (item.perKiloPriceId) {
            const perKiloPrice = await tx.perKiloPrice.findFirst({
              where: {
                id: item.perKiloPriceId,
                productId: item.productId,
                stock: {
                  gte: item.quantity,
                },
              },
            });

            if (!perKiloPrice) {
              throw new Error(
                `Insufficient stock for ${product.name} (per kilo)`,
              );
            }

            totalPrice += perKiloPrice.price * item.quantity;
          }
        }

        // Delete existing order items
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // Update the order with new items
        return tx.order.update({
          where: { id },
          data: {
            totalPrice,
            OrderItem: {
              create: orderItem.map((item) => ({
                quantity: item.quantity,
                product: { connect: { id: item.productId } },
                isSpecialPrice: item.isSpecialPrice || false,
                ...(item.sackPriceId && {
                  SackPrice: { connect: { id: item.sackPriceId } },
                }),
                ...(item.perKiloPriceId && {
                  perKiloPrice: { connect: { id: item.perKiloPriceId } },
                }),
              })),
            },
          },
          include: {
            OrderItem: {
              include: {
                product: true,
                SackPrice: {
                  include: {
                    specialPrice: true,
                  },
                },
                perKiloPrice: true,
              },
            },
            customer: true,
          },
        });
      },
      {
        timeout: 20000,
      },
    );
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

  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        cashier: {
          select: {
            id: true,
            name: true,
          },
        },
        OrderItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });
    return this.formatOrders(orders);
  }

  async getUserOrderById(userId: string, orderId: string) {
    const result = await this.prisma.order.findUnique({
      where: {
        id: orderId,
        userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        cashier: {
          select: {
            id: true,
            name: true,
          },
        },
        OrderItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });
    return this.formatOrder(result);
  }

  // New method to get orders for a specific cashier
  async getCashierOrders(cashierId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        cashierId,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        cashier: {
          select: {
            id: true,
            name: true,
          },
        },
        OrderItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });
    return this.formatOrders(orders);
  }

  // New method to get a specific order for a cashier
  async getCashierOrderById(cashierId: string, orderId: string) {
    const result = await this.prisma.order.findUnique({
      where: {
        id: orderId,
        cashierId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        cashier: {
          select: {
            id: true,
            name: true,
          },
        },
        OrderItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });
    return this.formatOrder(result);
  }
}
