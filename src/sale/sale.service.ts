import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSaleDto } from './dto/create.dto';
import { EditSaleDto } from './dto/edit.dto';
import { OrderService } from 'src/order/order.service';
import { RecentSalesFilterDto } from './dto/recent-sales.dto';
import {
  convertObjectDatesToManilaTime,
  convertArrayDatesToManilaTime,
  getManilaDateRangeForQuery,
} from '../utils/date.util';

@Injectable()
export class SaleService {
  constructor(
    private prisma: PrismaService,
    private order: OrderService,
  ) {}

  private formatSale(sale: any) {
    if (!sale) return null;
    const formatted = {
      ...sale,
      SaleItem: sale.SaleItem
        ? convertArrayDatesToManilaTime(
            sale.SaleItem.map((item) => ({
              ...item,
              product: item.product
                ? convertObjectDatesToManilaTime(item.product)
                : null,
            })),
          )
        : [],
    };
    return convertObjectDatesToManilaTime(formatted);
  }

  private formatSales(sales: any[]) {
    return sales.map((sale) => this.formatSale(sale));
  }

  async createSale(cashierId: string, products: CreateSaleDto) {
    const { totalAmount, paymentMethod, saleItem, orderId, metadata } =
      products;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Update stock for each item
        for (const item of saleItem) {
          if (item.perKiloPrice) {
            // Update per kilo stock
            await tx.perKiloPrice.update({
              where: { id: item.perKiloPrice.id },
              data: {
                stock: { decrement: item.perKiloPrice.quantity },
              },
            });
          }

          if (item.sackPrice) {
            // Update sack price stock
            await tx.sackPrice.update({
              where: { id: item.sackPrice.id },
              data: {
                stock: { decrement: item.sackPrice.quantity },
              },
            });
          }
        }

        // 2. Create the sale with items
        const sale = await tx.sale.create({
          data: {
            totalAmount,
            paymentMethod,
            cashier: {
              connect: { id: cashierId },
            },
            // Connect to order if orderId is provided
            ...(orderId && {
              Order: {
                connect: { id: orderId },
              },
            }),
            SaleItem: {
              create: saleItem.map((item) => {
                const quantity = item.perKiloPrice
                  ? item.perKiloPrice.quantity
                  : item.sackPrice?.quantity || 0;

                // Base item data
                const saleItemData = {
                  quantity,
                  isGantang: item.isGantang,
                  isSpecialPrice: item.isSpecialPrice,
                  // Ensure isDiscounted is always a boolean
                  isDiscounted: item.isDiscounted ?? false,
                  // Only add discountedPrice if it's defined
                  ...(item.discountedPrice !== undefined && {
                    discountedPrice: item.discountedPrice,
                  }),
                  product: {
                    connect: { id: item.id },
                  },
                };

                // Add connections based on price type
                if (item.perKiloPrice) {
                  return {
                    ...saleItemData,
                    perKiloPrice: {
                      connect: { id: item.perKiloPrice.id },
                    },
                  };
                }

                if (item.sackPrice) {
                  return {
                    ...saleItemData,
                    SackPrice: {
                      connect: { id: item.sackPrice.id },
                    },
                    sackType: item.sackPrice.type,
                  };
                }

                return saleItemData;
              }),
            },
          },
          include: {
            SaleItem: {
              include: {
                product: {
                  include: {
                    perKiloPrice: true,
                    SackPrice: {
                      include: {
                        specialPrice: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // 3. If an order ID was provided, update the order status to COMPLETED
        if (orderId) {
          this.order.completeOrder(orderId, sale.id);
        }

        // 4. Return the sale with metadata attached (not saved to DB)
        const saleWithMetadata = {
          ...sale,
          ...(metadata && { metadata }),
        };

        // Format the result to convert dates to Manila time
        return this.formatSale(saleWithMetadata);
      },
      {
        timeout: 20000, // 20 seconds in milliseconds
      },
    );

    return result;
  }

  async editSale(id: string, products: EditSaleDto) {
    const { totalAmount, paymentMethod, saleItem, orderId } = products;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Get the existing sale first
        const existingSale = await tx.sale.findUnique({
          where: { id },
          include: {
            SaleItem: {
              include: {
                product: {
                  include: {
                    perKiloPrice: true,
                    SackPrice: {
                      include: {
                        specialPrice: true,
                      },
                    },
                  },
                },
              },
            },
            Order: true,
          },
        });

        // If there was a previous order connection and we're changing it, update the previous order
        if (existingSale.Order && existingSale.Order.id !== orderId) {
          await tx.order.update({
            where: { id: existingSale.Order.id },
            data: { status: 'PENDING', saleId: null },
          });
        }

        // Increment the stock for each item in the existing saleitems and delete saleitems
        for (const item of existingSale.SaleItem) {
          if (item.product.perKiloPrice) {
            // Update per kilo stock
            await tx.perKiloPrice.update({
              where: { id: item.product.perKiloPrice.id },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }

          if (item.product.SackPrice && item.product.SackPrice.length > 0) {
            // Update sack price stock
            await tx.sackPrice.update({
              where: { id: item.product.SackPrice[0].id },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }

          // Delete the sale item
          await tx.saleItem.delete({
            where: { id: item.id },
          });
        }

        // Decrement with new stock and create the new sale items
        for (const item of saleItem) {
          const quantity = item.perKiloPrice
            ? item.perKiloPrice.quantity
            : item.sackPrice?.quantity || 0;

          if (item.perKiloPrice) {
            // Update per kilo stock
            await tx.perKiloPrice.update({
              where: { id: item.perKiloPrice.id },
              data: {
                stock: { decrement: item.perKiloPrice.quantity },
              },
            });
          }

          if (item.sackPrice) {
            // Update sack price stock
            await tx.sackPrice.update({
              where: { id: item.sackPrice.id },
              data: {
                stock: { decrement: item.sackPrice.quantity },
              },
            });
          }

          // Create the new sale item with proper connections
          const saleItemData = {
            quantity: quantity,
            isGantang: item.isGantang,
            isSpecialPrice: item.isSpecialPrice,
            // Ensure isDiscounted is always a boolean
            isDiscounted: item.isDiscounted ?? false,
            // Only add discountedPrice if it's defined
            ...(item.discountedPrice !== undefined && {
              discountedPrice: item.discountedPrice,
            }),
            product: {
              connect: { id: item.id },
            },
            sale: {
              connect: { id },
            },
          };

          // Add specific price connections
          if (item.perKiloPrice) {
            await tx.saleItem.create({
              data: {
                ...saleItemData,
                perKiloPrice: {
                  connect: { id: item.perKiloPrice.id },
                },
              },
            });
          } else if (item.sackPrice) {
            await tx.saleItem.create({
              data: {
                ...saleItemData,
                SackPrice: {
                  connect: { id: item.sackPrice.id },
                },
                sackType: item.sackPrice.type,
              },
            });
          } else {
            await tx.saleItem.create({
              data: saleItemData,
            });
          }
        }

        // Update the sale with new data and connect/disconnect order if needed
        const updateData: any = {
          totalAmount,
          paymentMethod,
        };

        // Handle order connection/disconnection
        if (orderId) {
          // Connect to the new order and update its status
          updateData.Order = { connect: { id: orderId } };
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'COMPLETED' },
          });
        } else if (existingSale.Order) {
          // Disconnect from any existing order
          updateData.Order = { disconnect: true };
        }

        const updatedSale = await tx.sale.update({
          where: { id },
          data: updateData,
          include: {
            SaleItem: {
              include: {
                product: {
                  include: {
                    perKiloPrice: true,
                    SackPrice: {
                      include: {
                        specialPrice: true,
                      },
                    },
                  },
                },
              },
            },
            Order: true,
          },
        });

        // Format the result to convert dates to Manila time
        return this.formatSale(updatedSale);
      },
      {
        timeout: 20000, // 20 seconds in milliseconds
      },
    );

    return result;
  }

  async deleteSale(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Get the sale with all its items and product details
        const sale = await tx.sale.findUnique({
          where: { id },
          include: {
            SaleItem: {
              include: {
                product: true,
                perKiloPrice: true,
                SackPrice: true,
              },
            },
            Order: true,
          },
        });

        if (!sale) {
          throw new Error(`Sale with ID ${id} not found`);
        }

        // 2. Return items to inventory
        for (const item of sale.SaleItem) {
          // Restore perKiloPrice stock
          if (item.perKiloPriceId) {
            await tx.perKiloPrice.update({
              where: { id: item.perKiloPriceId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }

          // Restore SackPrice stock
          if (item.sackPriceId) {
            await tx.sackPrice.update({
              where: { id: item.sackPriceId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }
        }

        // 3. If there's an associated order, update its status
        if (sale.Order) {
          await tx.order.update({
            where: { id: sale.Order.id },
            data: { status: 'PENDING', saleId: null },
          });
        }

        // 4. Delete the sale (this will cascade delete the SaleItems)
        return tx.sale.delete({
          where: { id },
        });
      },
      {
        timeout: 20000, // 20 seconds in milliseconds
      },
    );
  }

  async getSale(id: string) {
    const result = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        SaleItem: {
          include: {
            product: {
              include: {
                perKiloPrice: true,
                SackPrice: {
                  include: {
                    specialPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return this.formatSale(result);
  }

  async getSalesByDate(cashierId: string, filters: RecentSalesFilterDto) {
    try {
      // Use standardized date range query utility
      const { startOfDay, endOfDay } = getManilaDateRangeForQuery(filters.date);

      const sales = await this.prisma.sale.findMany({
        where: {
          AND: [
            {
              cashierId,
            },
            {
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          SaleItem: {
            include: {
              product: {
                include: {
                  perKiloPrice: true,
                  SackPrice: {
                    include: {
                      specialPrice: true,
                    },
                  },
                },
              },
              perKiloPrice: true,
              SackPrice: true,
            },
          },
        },
      });

      if (!sales) {
        return [];
      }

      return this.formatSales(sales);
    } catch (error) {
      console.error('Error fetching sales by date:', error);
      return [];
    }
  }

  async getAllSales(userId: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        cashier: {
          userId,
        },
      },
      include: {
        SaleItem: {
          include: {
            product: {
              include: {
                perKiloPrice: true,
                SackPrice: {
                  include: {
                    specialPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return this.formatSales(sales);
  }

  async getSalesByCashier(cashierId: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        cashierId,
      },
      include: {
        SaleItem: {
          include: {
            product: {
              include: {
                perKiloPrice: true,
                SackPrice: {
                  include: {
                    specialPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return this.formatSales(sales);
  }

  async getSalesByCashierId(userId: string, cashierId: string) {
    // First verify that the cashier belongs to the user
    const cashier = await this.prisma.cashier.findFirst({
      where: {
        id: cashierId,
        userId: userId,
      },
    });

    if (!cashier) {
      throw new Error('Cashier not found or does not belong to this user');
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        cashierId,
      },
      include: {
        SaleItem: {
          include: {
            product: {
              include: {
                perKiloPrice: true,
                SackPrice: {
                  include: {
                    specialPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return this.formatSales(sales);
  }
}
