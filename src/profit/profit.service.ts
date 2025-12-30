import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitFilterDto } from './dto/profit-filter.dto';
import { PaymentMethod, Prisma, SackType } from '@prisma/client';
import {
  getManilaDateRangeForQuery,
} from '../utils/date.util';

interface ProfitSummary {
  id: string;
  productId: string;
  productName: string;
  totalQuantitySold: string; // Changed to string for Decimal
  totalProfit: string; // Changed to string for Decimal
  priceType: string;
  paymentMethod: PaymentMethod;
  isSpecialPrice: boolean;
  saleDate: Date;
}

interface GroupedProfit {
  productName: string;
  priceType: string;
  profitPerUnit: string; // Changed to string for Decimal
  totalQuantity: string; // Changed to string for Decimal
  totalProfit: string; // Changed to string for Decimal
  orders: number;
}

@Injectable()
export class ProfitService {
  constructor(private prisma: PrismaService) {}

  // Helper method to convert Decimal to string
  private decimalToString(value: Prisma.Decimal | null | undefined): string {
    return value ? value.toString() : '0';
  }

  // Helper method to add decimal strings
  private addDecimalStrings(a: string, b: string): string {
    return (parseFloat(a) + parseFloat(b)).toString();
  }

  // Helper method to multiply decimal strings
  private multiplyDecimalStrings(a: string, b: string): string {
    return (parseFloat(a) * parseFloat(b)).toString();
  }

  async getProfitsWithFilter(userId: string, filters: ProfitFilterDto) {
    // Use timezone-aware date filtering
    const dateFilter = createManilaDateFilter(filters.date);

    // Build the query conditions
    const whereConditions: any = {
      AND: [
        {
          cashier: {
            userId,
          },
        },
        {
          isVoid: false,
        },
        {
          createdAt: dateFilter,
        },
      ],
    };

    // Get the sales with filters
    const sales = await this.prisma.sale.findMany({
      where: whereConditions,
      include: {
        SaleItem: {
          include: {
            product: { select: { id: true, name: true } }, // Select only needed product fields
            SackPrice: {
              include: {
                specialPrice: true, // For profit calculation
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Filtered Sales:', sales);

    // Process and calculate profits for each sale item
    const profitItems = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        if (!item.product) return false; // Essential for name-based filters

        // Apply general filters first
        if (filters.productId && item.productId !== filters.productId) {
          return false;
        }
        if (
          filters.productSearch &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productSearch.toLowerCase())
        ) {
          return false;
        }

        // Handle priceType specific filters
        if (filters.priceType === 'ASIN') {
          if (!item.product.name.toLowerCase().includes('asin')) return false;
        } else if (filters.priceType === 'SACK') {
          if (item.product.name.toLowerCase().includes('asin')) return false; // Must not be ASIN
          if (!item.sackPriceId) return false; // Must be a sack sale
          if (filters.sackType && item.sackType !== filters.sackType) {
            return false;
          }
        } else if (filters.priceType) {
          if (
            filters.sackType &&
            (!item.sackPriceId || item.sackType !== filters.sackType)
          ) {
            return false;
          }
        } else {
          if (
            filters.sackType &&
            (!item.sackPriceId || item.sackType !== filters.sackType)
          ) {
            return false;
          }
        }

        return true;
      }).map((item) => {
        let totalProfit = '0';
        let profitPerUnit = '0';
        let priceType: SackType | null = null; // This will store the SackType enum
        let formattedPriceType = '';

        // Calculate profit only for sack sales with available SackPrice information
        if (item.sackPriceId && item.SackPrice && item.sackType) {
          const sackPriceInfo = item.SackPrice;
          priceType = item.sackType; // Store the enum value

          if (item.isSpecialPrice && sackPriceInfo.specialPrice) {
            profitPerUnit = this.decimalToString(
              sackPriceInfo.specialPrice.profit,
            );
          } else {
            profitPerUnit = this.decimalToString(sackPriceInfo.profit);
          }
          totalProfit = this.multiplyDecimalStrings(
            profitPerUnit,
            this.decimalToString(item.quantity),
          );

          switch (item.sackType) {
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
              formattedPriceType = item.sackType; // Fallback to the enum string if not matched
          }
        }

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Unknown Product',
          quantity: this.decimalToString(item.quantity),
          profitPerUnit,
          totalProfit,
          priceType: priceType || '', // Ensure it's a string or the enum, handle null if no sackType
          formattedPriceType,
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: sale.createdAt, // Convert to Manila time
          isAsin: item.product?.name.toLowerCase().includes('asin') || false,
        };
      });
    });

    // Group by product name and price type
    const groupedProfits: Record<string, GroupedProfit> = {};

    profitItems.forEach((item) => {
      // Removed profit filtering to match sales history display
      // if (item.totalProfit <= 0) return;
      // if (item.profitPerUnit == null || item.profitPerUnit === 0) return;

      const key = item.isAsin
        ? `ASIN_${item.productName}`
        : `SACK_${item.productName}_${item.formattedPriceType}`;

      if (!groupedProfits[key]) {
        groupedProfits[key] = {
          productName: item.productName,
          priceType: item.formattedPriceType,
          profitPerUnit: item.profitPerUnit,
          totalQuantity: '0',
          totalProfit: '0',
          orders: 0,
        };
      }

      groupedProfits[key].totalQuantity = this.addDecimalStrings(
        groupedProfits[key].totalQuantity,
        item.quantity,
      );
      groupedProfits[key].totalProfit = this.addDecimalStrings(
        groupedProfits[key].totalProfit,
        item.totalProfit,
      );
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
      (sum, item) => this.addDecimalStrings(sum, item.totalProfit),
      '0',
    );
    const asinTotal = asinProducts.reduce(
      (sum, item) => this.addDecimalStrings(sum, item.totalProfit),
      '0',
    );
    const overallTotal = this.addDecimalStrings(sackTotal, asinTotal);

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
      rawItems: profitItems,
    };
  }

  // New method for cashier-specific profits using cashier ID
  async getCashierProfitsWithFilter(
    cashierId: string,
    filters: ProfitFilterDto,
  ) {
    // Use timezone-aware date filtering
    const dateFilter = createManilaDateFilter(filters.date);

    // Build the query conditions for specific cashier
    const whereConditions: any = {
      AND: [
        {
          cashierId,
        },
        {
          isVoid: false,
        },
        {
          createdAt: dateFilter,
        },
      ],
    };

    // Get the sales with filters
    const sales = await this.prisma.sale.findMany({
      where: whereConditions,
      include: {
        SaleItem: {
          include: {
            product: { select: { id: true, name: true } },
            SackPrice: {
              include: {
                specialPrice: true,
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
        if (!item.product) return false;

        // Apply general filters first
        if (filters.productId && item.productId !== filters.productId) {
          return false;
        }
        if (
          filters.productSearch &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productSearch.toLowerCase())
        ) {
          return false;
        }

        // Handle priceType specific filters
        if (filters.priceType === 'ASIN') {
          if (!item.product.name.toLowerCase().includes('asin')) return false;
        } else if (filters.priceType === 'SACK') {
          if (item.product.name.toLowerCase().includes('asin')) return false;
          if (!item.sackPriceId) return false;
          if (filters.sackType && item.sackType !== filters.sackType) {
            return false;
          }
        } else if (filters.priceType) {
          if (
            filters.sackType &&
            (!item.sackPriceId || item.sackType !== filters.sackType)
          ) {
            return false;
          }
        } else {
          if (
            filters.sackType &&
            (!item.sackPriceId || item.sackType !== filters.sackType)
          ) {
            return false;
          }
        }

        return true;
      }).map((item) => {
        let totalProfit = '0';
        let profitPerUnit = '0';
        let priceType: SackType | null = null;
        let formattedPriceType = '';

        // Calculate profit only for sack sales with available SackPrice information
        if (item.sackPriceId && item.SackPrice && item.sackType) {
          const sackPriceInfo = item.SackPrice;
          priceType = item.sackType;

          if (item.isSpecialPrice && sackPriceInfo.specialPrice) {
            profitPerUnit = this.decimalToString(
              sackPriceInfo.specialPrice.profit,
            );
          } else {
            profitPerUnit = this.decimalToString(sackPriceInfo.profit);
          }
          totalProfit = this.multiplyDecimalStrings(
            profitPerUnit,
            this.decimalToString(item.quantity),
          );

          switch (item.sackType) {
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
              formattedPriceType = item.sackType;
          }
        }

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Unknown Product',
          quantity: this.decimalToString(item.quantity),
          profitPerUnit,
          totalProfit,
          priceType: priceType || '',
          formattedPriceType,
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: sale.createdAt, // Convert to Manila time
          isAsin: item.product?.name.toLowerCase().includes('asin') || false,
        };
      });
    });

    // Group by product name and price type
    const groupedProfits: Record<string, GroupedProfit> = {};

    profitItems.forEach((item) => {
      // Removed profit filtering to match sales history display
      // if (item.totalProfit <= 0) return;
      // if (item.profitPerUnit == null || item.profitPerUnit === 0) return;

      const key = item.isAsin
        ? `ASIN_${item.productName}`
        : `SACK_${item.productName}_${item.formattedPriceType}`;

      if (!groupedProfits[key]) {
        groupedProfits[key] = {
          productName: item.productName,
          priceType: item.formattedPriceType,
          profitPerUnit: item.profitPerUnit,
          totalQuantity: '0',
          totalProfit: '0',
          orders: 0,
        };
      }

      groupedProfits[key].totalQuantity = this.addDecimalStrings(
        groupedProfits[key].totalQuantity,
        item.quantity,
      );
      groupedProfits[key].totalProfit = this.addDecimalStrings(
        groupedProfits[key].totalProfit,
        item.totalProfit,
      );
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
      (sum, item) => this.addDecimalStrings(sum, item.totalProfit),
      '0',
    );
    const asinTotal = asinProducts.reduce(
      (sum, item) => this.addDecimalStrings(sum, item.totalProfit),
      '0',
    );
    const overallTotal = this.addDecimalStrings(sackTotal, asinTotal);

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
      rawItems: profitItems,
    };
  }

  // New method for getting all cashier profits under a user
  async getAllCashierProfitsByDate(userId: string, date?: string) {
    // Get all cashiers under this user
    const cashiers = await this.prisma.cashier.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
      },
    });

    // Get profits for each cashier
    const cashierProfits = await Promise.all(
      cashiers.map(async (cashier) => {
        const profits = await this.getCashierProfitsWithFilter(cashier.id, {
          date,
        });
        return {
          cashier: {
            id: cashier.id,
            name: cashier.name,
          },
          profits,
        };
      }),
    );

    return cashierProfits;
  }
   async getCashierProfitDashboardSummary(
    cashierId: string,
    dateString: string,
  ) {
    // 1. Parse the selected date properly to avoid timezone issues
    // dateString format: "YYYY-MM-DD"
    const [year, month, day] = dateString.split('-').map(Number);

    // Helper to create proper Manila time range for a specific date
    // Uses Date.UTC() to avoid server timezone issues
    const createManilaDateRange = (y: number, m: number, d: number) => {
      // Manila is UTC+8
      // Dec 1 00:00:00 Manila = Nov 30 16:00:00 UTC (subtract 8 hours)
      // Dec 1 23:59:59 Manila = Dec 1 15:59:59 UTC (subtract 8 hours)
      
      // Create UTC timestamps first, then subtract 8 hours to convert Manila -> UTC
      const startOfDayUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
      const endOfDayUTC = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);

      console.log(`📅 Manila date range for ${y}-${m}-${d}:`, {
        startUTC: startOfDayUTC.toISOString(),
        endUTC: endOfDayUTC.toISOString(),
      });

      return { startOfDay: startOfDayUTC, endOfDay: endOfDayUTC };
    };

    // Selected day range (for current day profits)
    const selectedDayRange = createManilaDateRange(year, month, day);

    // Start of the Month (e.g., Dec 1)
    const startOfMonthRange = createManilaDateRange(year, month, 1);

    // Previous day (day - 1)
    // Handle month boundary: if day is 1, previousDayDate will correctly go to previous month
    const previousDayDate = new Date(Date.UTC(year, month - 1, day - 1));
    const previousDayRange = createManilaDateRange(
      previousDayDate.getUTCFullYear(),
      previousDayDate.getUTCMonth() + 1,
      previousDayDate.getUTCDate(),
    );

    console.log(`🔍 Dashboard Summary for ${dateString}:`, {
      selectedDay: day,
      startOfMonthStart: startOfMonthRange.startOfDay.toISOString(),
      previousDayEnd: previousDayRange.endOfDay.toISOString(),
      currentDayStart: selectedDayRange.startOfDay.toISOString(),
      currentDayEnd: selectedDayRange.endOfDay.toISOString(),
    });

    // 2. Query: Previous Days (Start of Month to Day Before Selected)
    // Only query if selected day is not the 1st of the month
    let previousDaysSales: any[] = [];
    if (day > 1) {
      console.log(`📊 Querying previous days from ${startOfMonthRange.startOfDay.toISOString()} to ${previousDayRange.endOfDay.toISOString()}`);
      previousDaysSales = await this.prisma.sale.findMany({
        where: {
          cashierId,
          createdAt: {
            gte: startOfMonthRange.startOfDay,
            lte: previousDayRange.endOfDay, // Up to end of previous day
          },
        },
        include: {
          SaleItem: {
            include: {
              product: { select: { id: true, name: true } },
              SackPrice: {
                include: {
                  specialPrice: true,
                },
              },
            },
          },
        },
      });
      console.log(`📊 Found ${previousDaysSales.length} sales in previous days`);
    }

    // 3. Query: Current Day
    const currentDaySales = await this.prisma.sale.findMany({
      where: {
        cashierId,
        createdAt: {
          gte: selectedDayRange.startOfDay,
          lte: selectedDayRange.endOfDay,
        },
      },
      include: {
        SaleItem: {
          include: {
            product: { select: { id: true, name: true } },
            SackPrice: {
              include: {
                specialPrice: true,
              },
            },
          },
        },
      },
    });

    // 4. Calculate profits using helper method
    const previousDaysProfitData = this.calculateProfitFromSales(previousDaysSales);
    const currentDayProfitData = this.calculateProfitFromSales(currentDaySales);

    return {
      date: dateString,
      previousDaysProfit: {
        sackTotal: previousDaysProfitData.sackTotal,
        asinTotal: previousDaysProfitData.asinTotal,
        overallTotal: previousDaysProfitData.overallTotal,
        rawItems: previousDaysProfitData.rawItems,
      },
      currentDayProfit: {
        sackTotal: currentDayProfitData.sackTotal,
        asinTotal: currentDayProfitData.asinTotal,
        overallTotal: currentDayProfitData.overallTotal,
        rawItems: currentDayProfitData.rawItems,
      },
      overallProfit:
        previousDaysProfitData.overallTotal + currentDayProfitData.overallTotal,
    };
  }

  /**
   * Helper method to calculate profit from a list of sales
   */
  private calculateProfitFromSales(sales: any[]) {
    const profitItems: any[] = [];
    let totalSaleItems = 0;
    let skippedNoProduct = 0;
    let sackItemsWithProfit = 0;
    let sackItemsWithoutSackPrice = 0;

    sales.forEach((sale) => {
      sale.SaleItem.forEach((item: any) => {
        totalSaleItems++;
        
        if (!item.product) {
          skippedNoProduct++;
          return;
        }

        let totalProfit = 0;
        let profitPerUnit = 0;
        let priceType: SackType | null = null;
        let formattedPriceType = '';

        // Calculate profit only for sack sales with available SackPrice information
        if (item.sackPriceId && item.SackPrice && item.sackType) {
          sackItemsWithProfit++;
          const sackPriceInfo = item.SackPrice;
          priceType = item.sackType;

          if (item.isSpecialPrice && sackPriceInfo.specialPrice) {
            profitPerUnit = sackPriceInfo.specialPrice.profit ?? 0;
          } else {
            profitPerUnit = sackPriceInfo.profit ?? 0;
          }
          totalProfit = profitPerUnit * item.quantity;

          switch (item.sackType) {
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
              formattedPriceType = item.sackType;
          }
        } else if (item.sackPriceId || item.sackType) {
          // Item has sackPriceId or sackType but missing SackPrice relationship
          sackItemsWithoutSackPrice++;
          console.log(`⚠️ Sack item missing SackPrice:`, {
            productName: item.product?.name,
            sackPriceId: item.sackPriceId,
            sackType: item.sackType,
            hasSackPrice: !!item.SackPrice,
          });
        }

        // Push ALL items regardless of profit
        profitItems.push({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Unknown Product',
          quantity: item.quantity,
          profitPerUnit,
          totalProfit,
          priceType: priceType || '',
          formattedPriceType,
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: sale.createdAt,
          isAsin: item.product?.name.toLowerCase().includes('asin') || false,
          sackType: item.sackType || null,
        });
      });
    });

    console.log(`📊 Profit calculation summary:`, {
      totalSales: sales.length,
      totalSaleItems,
      skippedNoProduct,
      sackItemsWithProfit,
      sackItemsWithoutSackPrice,
      finalProfitItems: profitItems.length,
    });

    // Calculate totals
    const sackTotal = profitItems
      .filter((item) => !item.isAsin)
      .reduce((sum, item) => sum + item.totalProfit, 0);

    const asinTotal = profitItems
      .filter((item) => item.isAsin)
      .reduce((sum, item) => sum + item.totalProfit, 0);

    return {
      rawItems: profitItems,
      sackTotal,
      asinTotal,
      overallTotal: sackTotal + asinTotal,
    };
  }
}
