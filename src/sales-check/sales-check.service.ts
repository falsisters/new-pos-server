import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesCheckFilterDto } from './dto/sales-check.dto';

@Injectable()
export class SalesCheckService {
  constructor(private prisma: PrismaService) {}

  async getSalesWithFilter(userId: string, filters: SalesCheckFilterDto) {
    // Set default date to today if not provided
    const targetDate = filters.date ? new Date(filters.date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build the query conditions
    const whereConditions: any = {
      AND: [
        {
          cashier: {
            userId,
          },
        },
        {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      ],
    };

    // Get the sales with filters
    const sales = await this.prisma.sale.findMany({
      where: whereConditions,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Process and format the results
    const formattedSales = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        // Filter by product ID if specified
        if (filters.productId && item.product.id !== filters.productId) {
          return false;
        }

        // Filter by product name search if specified
        if (
          filters.productSearch &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productSearch.toLowerCase())
        ) {
          return false;
        }

        // Filter by price type (SACK or KILO)
        if (filters.priceType === 'SACK' && item.isGantang) {
          return false;
        }
        if (filters.priceType === 'KILO' && !item.isGantang) {
          return false;
        }

        // Filter by sack type if applicable
        if (filters.priceType === 'SACK' && filters.sackType) {
          // This requires additional context to properly filter
          // We'd need to know which sack type was sold, which isn't directly in SaleItem
          // This would need adjustment based on your data model
          return true;
        }

        return true;
      }).map((item) => {
        let priceType = '';
        let totalAmount = 0;

        if (item.isGantang) {
          priceType = '[KILO]KG';
          // Calculate total amount for per kilo sales
          if (item.product.perKiloPrice) {
            totalAmount = item.product.perKiloPrice.price * item.quantity;
          }
        } else {
          // Determine sack type based on quantity or relation
          const sackInfo = item.product.SackPrice.find((sp) =>
            filters.sackType
              ? sp.type === filters.sackType
              : sp.type === 'FIFTY_KG',
          );

          if (sackInfo) {
            priceType = sackInfo.type;

            // Calculate total amount based on special price or regular price
            if (item.isSpecialPrice && sackInfo.specialPrice) {
              totalAmount = sackInfo.specialPrice.price * item.quantity;
            } else {
              totalAmount = sackInfo.price * item.quantity;
            }
          } else {
            priceType = 'UNKNOWN';
          }
        }

        return {
          id: item.id,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            name: item.product.name,
          },
          priceType,
          totalAmount: Number(totalAmount.toFixed(2)), // Format to 2 decimal places
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: sale.createdAt,
        };
      });
    });

    return formattedSales;
  }
}
