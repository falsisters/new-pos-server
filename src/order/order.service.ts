import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create.dto';
import { EditOrderDto } from './dto/edit.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async getOrderById(id: string) {
    return this.prisma.order.findUnique({
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
        OrderItem: {
          include: {
            SackPrice: true,
            perKiloPrice: true,
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
        OrderItem: {
          include: {
            SackPrice: true,
            perKiloPrice: true,
            product: true,
          },
        },
      },
    });
  }

  // New method to get products available for orders from all cashiers under a user
  async getAvailableProductsForOrder(userId: string) {
    return this.prisma.product.findMany({
      where: {
        cashier: {
          userId,
        },
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
  }

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { customerId, orderItem, totalPrice } = createOrderDto;

    return this.prisma.$transaction(
      async (tx) => {
        // Verify that all products belong to cashiers under this user
        for (const item of orderItem) {
          const product = await tx.product.findFirst({
            where: {
              id: item.id,
              cashier: {
                userId, // Ensure product belongs to a cashier under this user
              },
            },
            include: {
              cashier: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          });

          if (!product) {
            throw new Error(
              `Product ${item.id} not found or not available from your stores`,
            );
          }

          // Check stock availability
          if (item.sackPrice) {
            const sackPrice = await tx.sackPrice.findFirst({
              where: {
                id: item.sackPrice.id,
                productId: item.id,
                stock: {
                  gte: item.sackPrice.quantity,
                },
              },
            });

            if (!sackPrice) {
              throw new Error(
                `Insufficient stock for ${product.name} (${item.sackPrice.type}) at ${product.cashier.name}`,
              );
            }
          }

          if (item.perKiloPrice) {
            const perKiloPrice = await tx.perKiloPrice.findFirst({
              where: {
                id: item.perKiloPrice.id,
                productId: item.id,
                stock: {
                  gte: item.perKiloPrice.quantity,
                },
              },
            });

            if (!perKiloPrice) {
              throw new Error(
                `Insufficient stock for ${product.name} (per kilo) at ${product.cashier.name}`,
              );
            }
          }
        }

        // Create the order
        return tx.order.create({
          data: {
            totalPrice,
            user: { connect: { id: userId } },
            customer: { connect: { id: customerId } },
            OrderItem: {
              create: orderItem.map((item) => {
                const orderItemData: any = {
                  quantity: item.sackPrice
                    ? item.sackPrice.quantity
                    : item.perKiloPrice.quantity,
                  product: { connect: { id: item.id } },
                  isSpecialPrice: item.isSpecialPrice || false,
                };

                if (item.sackPrice && item.sackPrice.id) {
                  orderItemData.SackPrice = {
                    connect: { id: item.sackPrice.id },
                  };
                  orderItemData.sackType = item.sackPrice.type;
                }

                if (item.perKiloPrice && item.perKiloPrice.id) {
                  orderItemData.perKiloPrice = {
                    connect: { id: item.perKiloPrice.id },
                  };
                }

                return orderItemData;
              }),
            },
          },
          include: {
            OrderItem: {
              include: {
                product: {
                  include: {
                    cashier: {
                      select: {
                        name: true,
                        id: true,
                      },
                    },
                  },
                },
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

  async editOrder(id: string, editOrderDto: EditOrderDto) {
    const { orderItem, totalPrice } = editOrderDto;

    return this.prisma.$transaction(
      async (tx) => {
        // Get the existing order to verify user ownership
        const existingOrder = await tx.order.findUnique({
          where: { id },
          include: {
            OrderItem: {
              include: {
                product: {
                  include: {
                    cashier: {
                      select: {
                        userId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!existingOrder) {
          throw new Error('Order not found');
        }

        const userId = existingOrder.OrderItem[0]?.product.cashier.userId;

        // Verify that all new products belong to cashiers under this user
        for (const item of orderItem) {
          const product = await tx.product.findFirst({
            where: {
              id: item.id,
              cashier: {
                userId,
              },
            },
            include: {
              cashier: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          });

          if (!product) {
            throw new Error(
              `Product ${item.id} not found or not available from your stores`,
            );
          }

          // Check stock availability for new items
          if (item.sackPrice) {
            const sackPrice = await tx.sackPrice.findFirst({
              where: {
                id: item.sackPrice.id,
                productId: item.id,
                stock: {
                  gte: item.sackPrice.quantity,
                },
              },
            });

            if (!sackPrice) {
              throw new Error(
                `Insufficient stock for ${product.name} (${item.sackPrice.type}) at ${product.cashier.name}`,
              );
            }
          }

          if (item.perKiloPrice) {
            const perKiloPrice = await tx.perKiloPrice.findFirst({
              where: {
                id: item.perKiloPrice.id,
                productId: item.id,
                stock: {
                  gte: item.perKiloPrice.quantity,
                },
              },
            });

            if (!perKiloPrice) {
              throw new Error(
                `Insufficient stock for ${product.name} (per kilo) at ${product.cashier.name}`,
              );
            }
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
              create: orderItem.map((item) => {
                const orderItemData: any = {
                  quantity: item.sackPrice
                    ? item.sackPrice.quantity
                    : item.perKiloPrice.quantity,
                  product: { connect: { id: item.id } },
                  isSpecialPrice: item.isSpecialPrice || false,
                };

                if (item.sackPrice && item.sackPrice.id) {
                  orderItemData.SackPrice = {
                    connect: { id: item.sackPrice.id },
                  };
                  orderItemData.sackType = item.sackPrice.type;
                }

                if (item.perKiloPrice && item.perKiloPrice.id) {
                  orderItemData.perKiloPrice = {
                    connect: { id: item.perKiloPrice.id },
                  };
                }

                return orderItemData;
              }),
            },
          },
          include: {
            OrderItem: {
              include: {
                product: {
                  include: {
                    cashier: {
                      select: {
                        name: true,
                        id: true,
                      },
                    },
                  },
                },
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
    return this.prisma.order.findMany({
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
        OrderItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });
  }

  async getUserOrderById(userId: string, orderId: string) {
    return this.prisma.order.findUnique({
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
        OrderItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
          },
        },
      },
    });
  }
}
