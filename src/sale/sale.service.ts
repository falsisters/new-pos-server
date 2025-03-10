import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSaleDto } from './dto/create.dto';
import { EditSaleDto } from './dto/edit.dto';

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  async createSale(cashierId: string, products: CreateSaleDto) {
    const { totalAmount, paymentMethod, saleItem } = products;

    return this.prisma.$transaction(async (tx) => {
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
      return tx.sale.create({
        data: {
          totalAmount,
          paymentMethod,
          cashier: {
            connect: { id: cashierId },
          },
          SaleItem: {
            create: saleItem.map((item) => {
              // Calculate the actual quantity based on the selected price option
              const quantity = item.perKiloPrice
                ? item.perKiloPrice.quantity
                : item.sackPrice?.quantity || 0;

              return {
                quantity,
                isGantang: item.isGantang,
                isSpecialPrice: item.isSpecialPrice,
                product: {
                  connect: { id: item.id },
                },
              };
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
    });
  }

  async editSale(id: string, products: EditSaleDto) {
    const { totalAmount, paymentMethod, saleItem } = products;

    return this.prisma.$transaction(async (tx) => {
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
        },
      });
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

        // Create the new sale item
        await tx.saleItem.create({
          data: {
            quantity: quantity,
            isGantang: item.isGantang,
            isSpecialPrice: item.isSpecialPrice,
            product: {
              connect: { id: item.id },
            },
            sale: {
              connect: { id },
            },
          },
        });

        await tx.sale.update({
          where: { id },
          data: {
            totalAmount,
            paymentMethod,
          },
        });
      }
    });
  }

  async deleteSale(id: string) {
    return this.prisma.sale.delete({
      where: { id },
    });
  }

  async getSale(id: string) {
    return this.prisma.sale.findUnique({
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
  }

  async getAllSales(userId: string) {
    return this.prisma.sale.findMany({
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
  }

  async getSalesByCashier(cashierId: string) {
    return this.prisma.sale.findMany({
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
  }
}
