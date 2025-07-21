import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitFilterDto } from './dto/profit-filter.dto';
import { PaymentMethod, SackType } from '@prisma/client';
import { convertToManilaTime } from '../utils/date.util';

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
        let totalProfit = 0;
        let profitPerUnit = 0;
        let priceType: SackType | null = null; // This will store the SackType enum
        let formattedPriceType = '';

        // Calculate profit only for sack sales with available SackPrice information
        if (item.sackPriceId && item.SackPrice && item.sackType) {
          const sackPriceInfo = item.SackPrice;
          priceType = item.sackType; // Store the enum value

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
              formattedPriceType = item.sackType; // Fallback to the enum string if not matched
          }
        }

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Unknown Product',
          quantity: item.quantity,
          profitPerUnit,
          totalProfit,
          priceType: priceType || '', // Ensure it's a string or the enum, handle null if no sackType
          formattedPriceType,
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          saleDate: convertToManilaTime(sale.createdAt), // Convert to Manila time
          isAsin: item.product?.name.toLowerCase().includes('asin') || false,
        };
      });
    });

    // Group by product name and price type
    const groupedProfits: Record<string, GroupedProfit> = {};

    profitItems.forEach((item) => {
      if (item.totalProfit <= 0) return; // Skip items with no profit

      // Skip items where profit is null, undefined, or zero
      if (item.profitPerUnit == null || item.profitPerUnit === 0) return;

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
      rawItems: profitItems,
    };
  }

  // New method for cashier-specific profits using cashier ID
  async getCashierProfitsWithFilter(
    cashierId: string,
    filters: ProfitFilterDto,
  ) {
    // Set default date to today if not provided
    const targetDate = filters.date ? new Date(filters.date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build the query conditions for specific cashier
    const whereConditions: any = {
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
        let totalProfit = 0;
        let profitPerUnit = 0;
        let priceType: SackType | null = null;
        let formattedPriceType = '';

        // Calculate profit only for sack sales with available SackPrice information
        if (item.sackPriceId && item.SackPrice && item.sackType) {
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
        }

        return {
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
          saleDate: convertToManilaTime(sale.createdAt), // Convert to Manila time
          isAsin: item.product?.name.toLowerCase().includes('asin') || false,
        };
      });
    });

    // Group by product name and price type
    const groupedProfits: Record<string, GroupedProfit> = {};

    profitItems.forEach((item) => {
      if (item.totalProfit <= 0) return;

      // Skip items where profit is null, undefined, or zero
      if (item.profitPerUnit == null || item.profitPerUnit === 0) return;

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
      rawItems: profitItems,
    };
  }

  // New method for getting all cashier profits under a user
  async getAllCashierProfitsByDate(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

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
}
