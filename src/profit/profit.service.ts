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

interface GroupedProfit {
  productName: string;
  priceType: string;
  profitPerUnit: number;
  totalQuantity: number;
  totalProfit: number;
  orders: number;
}

@Injectable()
export class ProfitService {
  constructor(private prisma: PrismaService) {}

  async getProfitsWithFilter(userId: string, filters: ProfitFilterDto) {
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
    const profitItems = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        // Special filter for Asin products
        if (filters.priceType === 'ASIN') {
          return item.product.name.toLowerCase().includes('asin');
        }

        // Filter for Sacks (not Asin and has SackPrice)
        if (filters.priceType === 'SACK') {
          return (
            !item.product.name.toLowerCase().includes('asin') &&
            !item.isGantang &&
            item.product.SackPrice.length > 0
          );
        }

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
        let profitPerUnit = 0;
        let priceType = '';
        let formattedPriceType = '';

        // For Sacks or Asin, we only care about sack prices (no PerKiloPrice)
        if (!item.isGantang) {
          // Find the matching sack price
          const defaultSackType = filters.sackType || SackType.FIFTY_KG;
          const sackPrice = item.product.SackPrice.find((sp) =>
            filters.sackType
              ? sp.type === filters.sackType
              : sp.type === defaultSackType,
          );

          if (sackPrice) {
            // If it's a special price sale and has specialPrice set
            if (item.isSpecialPrice && sackPrice.specialPrice) {
              profitPerUnit = sackPrice.specialPrice.profit;
              totalProfit = profitPerUnit * item.quantity;
            } else {
              profitPerUnit = sackPrice.profit;
              totalProfit = profitPerUnit * item.quantity;
            }
            priceType = sackPrice.type;

            // Format the price type for display
            switch (sackPrice.type) {
              case 'FIFTY_KG':
                formattedPriceType = '50KG';
                break;
              case 'TWENTY_FIVE_KG':
                formattedPriceType = '25KG';
                break;
              case 'FIVE_KG':
                formattedPriceType = '5KG';
                break;
              default:
                formattedPriceType = sackPrice.type;
            }
          }
        }

        return {
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          profitPerUnit,
          totalProfit,
          priceType,
          formattedPriceType,
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: sale.createdAt,
          isAsin: item.product.name.toLowerCase().includes('asin'),
        };
      });
    });

    // Group by product name and price type
    const groupedProfits: Record<string, GroupedProfit> = {};

    profitItems.forEach((item) => {
      if (item.totalProfit <= 0) return; // Skip items with no profit

      const key = item.isAsin
        ? `ASIN_${item.productName}`
        : `SACK_${item.productName}_${item.formattedPriceType}`;

      if (!groupedProfits[key]) {
        groupedProfits[key] = {
          productName: item.productName,
          priceType: item.formattedPriceType,
          profitPerUnit: item.profitPerUnit,
          totalQuantity: 0,
          totalProfit: 0,
          orders: 0,
        };
      }

      groupedProfits[key].totalQuantity += item.quantity;
      groupedProfits[key].totalProfit += item.totalProfit;
      groupedProfits[key].orders += 1;
    });

    // Separate Sacks and Asin products
    const sackProducts: GroupedProfit[] = [];
    const asinProducts: GroupedProfit[] = [];

    Object.values(groupedProfits).forEach((item) => {
      if (item.productName.toLowerCase().includes('asin')) {
        asinProducts.push(item);
      } else {
        sackProducts.push(item);
      }
    });

    // Calculate totals
    const sackTotal = sackProducts.reduce(
      (sum, item) => sum + item.totalProfit,
      0,
    );
    const asinTotal = asinProducts.reduce(
      (sum, item) => sum + item.totalProfit,
      0,
    );
    const overallTotal = sackTotal + asinTotal;

    // Format the response
    return {
      sacks: {
        items: sackProducts.map((item) => ({
          productName: `${item.productName} ${item.priceType}`,
          profitPerUnit: item.profitPerUnit,
          totalQuantity: item.totalQuantity,
          totalProfit: item.totalProfit,
          orders: item.orders,
          formattedSummary: `${item.productName} ${item.priceType} = ${item.profitPerUnit} X ${item.totalQuantity} orders = ${item.totalProfit} PESOS`,
        })),
        totalProfit: sackTotal,
      },
      asin: {
        items: asinProducts.map((item) => ({
          productName: item.productName,
          profitPerUnit: item.profitPerUnit,
          totalQuantity: item.totalQuantity,
          totalProfit: item.totalProfit,
          orders: item.orders,
          formattedSummary: `${item.productName} = ${item.profitPerUnit} x ${item.totalQuantity} orders = ${item.totalProfit}`,
        })),
        totalProfit: asinTotal,
      },
      overallTotal,
      rawItems: profitItems, // Include raw data for debugging or additional processing
    };
  }
}
