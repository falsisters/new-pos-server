import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitFilterDto } from './dto/profit-filter.dto';
import { PaymentMethod, SackType } from '@prisma/client';

interface ProfitSummary {
  id: string;
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalProfit: number;
  priceType: string;
  paymentMethod: PaymentMethod;
  isSpecialPrice: boolean;
  saleDate: Date;
}

@Injectable()
export class ProfitService {
  constructor(private prisma: PrismaService) {}

  async getProfitsWithFilter(
    userId: string,
    filters: ProfitFilterDto,
  ): Promise<ProfitSummary[]> {
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

    // Process and calculate profits for each sale item
    const profitSummary = sales.flatMap((sale) => {
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
          const matchingSackPrice = item.product.SackPrice.find(
            (sp) => sp.type === filters.sackType,
          );
          return !!matchingSackPrice;
        }

        return true;
      }).map((item) => {
        // Calculate profit based on item type
        let totalProfit = 0;
        let priceType = '';

        if (item.isGantang && item.product.perKiloPrice) {
          // Profit for per kilo sales
          totalProfit = item.product.perKiloPrice.profit * item.quantity;
          priceType = '[KILO]KG';
        } else {
          // Profit for sack sales
          // Find the matching sack price
          const defaultSackType = filters.sackType || SackType.FIFTY_KG;
          const sackPrice = item.product.SackPrice.find(
            (sp) => sp.type === defaultSackType,
          );

          if (sackPrice) {
            // If it's a special price sale and has specialPrice set
            if (item.isSpecialPrice && sackPrice.specialPrice) {
              totalProfit = sackPrice.specialPrice.profit * item.quantity;
            } else {
              totalProfit = sackPrice.profit * item.quantity;
            }
            priceType = sackPrice.type;
          }
        }

        return {
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          totalQuantitySold: item.quantity,
          totalProfit: totalProfit,
          priceType,
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: sale.createdAt,
        };
      });
    });

    return profitSummary;
  }
}
