import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesCheckFilterDto } from './dto/sales-check.dto';
import { TotalSalesFilterDto } from './dto/total-sales.dto';
import { PaymentMethod } from '@prisma/client';

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
            product: { select: { id: true, name: true } },
            SackPrice: {
              include: {
                specialPrice: true,
              },
            },
            perKiloPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // First, generate all sale items with full details
    const allSaleItems = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        // Filter by product ID if specified
        if (filters.productId && item.productId !== filters.productId) {
          return false;
        }

        // Filter by product name search if specified
        if (
          filters.productSearch &&
          item.product &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productSearch.toLowerCase())
        ) {
          return false;
        }

        // Filter by price type (SACK or KILO)
        if (filters.priceType === 'SACK' && !item.sackPriceId) {
          return false;
        }
        if (filters.priceType === 'KILO' && !item.perKiloPriceId) {
          return false;
        }

        // Filter by sack type if applicable
        if (
          filters.priceType === 'SACK' &&
          filters.sackType &&
          item.sackPriceId
        ) {
          if (item.sackType !== filters.sackType) {
            return false;
          }
        }

        // Filter by discount status if specified
        if (filters.isDiscounted !== undefined) {
          if (item.isDiscounted !== filters.isDiscounted) {
            return false;
          }
        }

        return true;
      }).map((item) => {
        let priceType = '';
        let totalAmount = 0;
        let unitPrice = 0;

        if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice * item.quantity;
        } else if (item.sackPriceId && item.SackPrice) {
          switch (item.sackType) {
            case 'FIFTY_KG':
              priceType = '50KG';
              break;
            case 'TWENTY_FIVE_KG':
              priceType = '25KG';
              break;
            case 'FIVE_KG':
              priceType = '5KG';
              break;
            default:
              priceType = item.sackType || 'SACK';
          }

          if (item.isSpecialPrice && item.SackPrice.specialPrice) {
            unitPrice = item.SackPrice.specialPrice.price;
          } else {
            unitPrice = item.SackPrice.price;
          }
          totalAmount = unitPrice * item.quantity;
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          totalAmount = item.discountedPrice * item.quantity;
          unitPrice = item.discountedPrice;
        }

        // Create a formatted sale item
        return {
          id: item.id,
          quantity: item.quantity,
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          unitPrice: Number(unitPrice.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted ? item.discountedPrice : null,
          saleDate: sale.createdAt,
        };
      });
    });

    // Now, group the sale items by product name and price type
    const groupedSales = allSaleItems.reduce((result, item) => {
      const key = `${item.product.name}-${item.priceType}`;

      if (!result[key]) {
        result[key] = {
          productName: item.product.name,
          priceType: item.priceType,
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
          paymentTotals: {
            [PaymentMethod.CASH]: 0,
            [PaymentMethod.CHECK]: 0,
            [PaymentMethod.BANK_TRANSFER]: 0,
          },
        };
      }

      result[key].items.push(item);
      result[key].totalQuantity += item.quantity;
      result[key].totalAmount += item.totalAmount;

      // Add to payment method totals
      result[key].paymentTotals[item.paymentMethod] += item.totalAmount;

      return result;
    }, {});

    // Convert groupedSales object to array and format for display
    return Object.values(groupedSales).map((group: any) => {
      return {
        productName: `${group.productName} ${group.priceType}`,
        items: group.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
          paymentMethod: item.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          formattedSale: `${item.quantity} ${item.product.name} ${item.priceType} = ${item.totalAmount}${
            item.paymentMethod !== 'CASH'
              ? ` (${item.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        })),
        totalQuantity: group.totalQuantity,
        totalAmount: Number(group.totalAmount.toFixed(2)),
        paymentTotals: {
          cash: Number(group.paymentTotals.CASH.toFixed(2)),
          check: Number(group.paymentTotals.CHECK.toFixed(2)),
          bankTransfer: Number(group.paymentTotals.BANK_TRANSFER.toFixed(2)),
        },
      };
    });
  }

  async getTotalSales(userId: string, filters: TotalSalesFilterDto) {
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

    // Get all sales for the day
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
            perKiloPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Filter and map sale items
    const allSaleItems = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        // Filter by product name if specified
        if (
          filters.productName &&
          item.product &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productName.toLowerCase())
        ) {
          return false;
        }

        // Filter by price type (SACK or KILO)
        if (filters.priceType === 'SACK' && !item.sackPriceId) {
          return false;
        }
        if (filters.priceType === 'KILO' && !item.perKiloPriceId) {
          return false;
        }

        // Filter by sack type if applicable
        if (
          filters.priceType === 'SACK' &&
          filters.sackType &&
          item.sackPriceId
        ) {
          if (item.sackType !== filters.sackType) {
            return false;
          }
        }

        // Filter by discount status if specified
        if (filters.isDiscounted !== undefined) {
          if (item.isDiscounted !== filters.isDiscounted) {
            return false;
          }
        }

        return true;
      }).map((item) => {
        let priceType = '';
        let totalAmount = 0;
        let unitPrice = 0;

        if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice * item.quantity;
        } else if (item.sackPriceId && item.SackPrice) {
          switch (item.sackType) {
            case 'FIFTY_KG':
              priceType = '50KG';
              break;
            case 'TWENTY_FIVE_KG':
              priceType = '25KG';
              break;
            case 'FIVE_KG':
              priceType = '5KG';
              break;
            default:
              priceType = item.sackType || 'SACK';
          }

          if (item.isSpecialPrice && item.SackPrice.specialPrice) {
            unitPrice = item.SackPrice.specialPrice.price;
          } else {
            unitPrice = item.SackPrice.price;
          }
          totalAmount = unitPrice * item.quantity;
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          totalAmount = item.discountedPrice * item.quantity;
          unitPrice = item.discountedPrice;
        }

        // Create a formatted sale item with time included
        const saleDateTime = sale.createdAt;
        const formattedTime = `${saleDateTime.getHours().toString().padStart(2, '0')}:${saleDateTime.getMinutes().toString().padStart(2, '0')}`;

        return {
          id: item.id,
          saleId: sale.id,
          quantity: item.quantity,
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          unitPrice: Number(unitPrice.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted ? item.discountedPrice : null,
          saleDate: sale.createdAt,
          formattedTime,
          formattedSale: `${item.quantity} ${item.product?.name || 'Unknown Product'} ${priceType} = ${Number(totalAmount.toFixed(2))}${
            sale.paymentMethod !== 'CASH'
              ? ` (${sale.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        };
      });
    });

    // Calculate totals and categorize by payment method
    const totalQuantity = allSaleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalAmount = allSaleItems.reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );

    // Group by payment method
    const paymentTotals = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.CHECK]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
    };

    allSaleItems.forEach((item) => {
      paymentTotals[item.paymentMethod] += item.totalAmount;
    });

    const nonCashTotal = paymentTotals.CHECK + paymentTotals.BANK_TRANSFER;
    const cashTotal = totalAmount - nonCashTotal;

    // Return formatted data for the UI
    return {
      items: allSaleItems,
      summary: {
        totalQuantity: Number(totalQuantity.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        paymentTotals: {
          cash: Number(cashTotal.toFixed(2)),
          check: Number(paymentTotals.CHECK.toFixed(2)),
          bankTransfer: Number(paymentTotals.BANK_TRANSFER.toFixed(2)),
        },
      },
    };
  }

  // New method for cashier-specific sales using cashier ID
  async getCashierSalesWithFilter(
    cashierId: string,
    filters: SalesCheckFilterDto,
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
            perKiloPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // First, generate all sale items with full details
    const allSaleItems = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        // Filter by product ID if specified
        if (filters.productId && item.productId !== filters.productId) {
          return false;
        }

        // Filter by product name search if specified
        if (
          filters.productSearch &&
          item.product &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productSearch.toLowerCase())
        ) {
          return false;
        }

        // Filter by price type (SACK or KILO)
        if (filters.priceType === 'SACK' && !item.sackPriceId) {
          return false;
        }
        if (filters.priceType === 'KILO' && !item.perKiloPriceId) {
          return false;
        }

        // Filter by sack type if applicable
        if (
          filters.priceType === 'SACK' &&
          filters.sackType &&
          item.sackPriceId
        ) {
          if (item.sackType !== filters.sackType) {
            return false;
          }
        }

        // Filter by discount status if specified
        if (filters.isDiscounted !== undefined) {
          if (item.isDiscounted !== filters.isDiscounted) {
            return false;
          }
        }

        return true;
      }).map((item) => {
        let priceType = '';
        let totalAmount = 0;
        let unitPrice = 0;

        if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice * item.quantity;
        } else if (item.sackPriceId && item.SackPrice) {
          switch (item.sackType) {
            case 'FIFTY_KG':
              priceType = '50KG';
              break;
            case 'TWENTY_FIVE_KG':
              priceType = '25KG';
              break;
            case 'FIVE_KG':
              priceType = '5KG';
              break;
            default:
              priceType = item.sackType || 'SACK';
          }

          if (item.isSpecialPrice && item.SackPrice.specialPrice) {
            unitPrice = item.SackPrice.specialPrice.price;
          } else {
            unitPrice = item.SackPrice.price;
          }
          totalAmount = unitPrice * item.quantity;
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          totalAmount = item.discountedPrice * item.quantity;
          unitPrice = item.discountedPrice;
        }

        // Create a formatted sale item
        return {
          id: item.id,
          quantity: item.quantity,
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          unitPrice: Number(unitPrice.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted ? item.discountedPrice : null,
          saleDate: sale.createdAt,
        };
      });
    });

    // Now, group the sale items by product name and price type
    const groupedSales = allSaleItems.reduce((result, item) => {
      const key = `${item.product.name}-${item.priceType}`;

      if (!result[key]) {
        result[key] = {
          productName: item.product.name,
          priceType: item.priceType,
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
          paymentTotals: {
            [PaymentMethod.CASH]: 0,
            [PaymentMethod.CHECK]: 0,
            [PaymentMethod.BANK_TRANSFER]: 0,
          },
        };
      }

      result[key].items.push(item);
      result[key].totalQuantity += item.quantity;
      result[key].totalAmount += item.totalAmount;

      // Add to payment method totals
      result[key].paymentTotals[item.paymentMethod] += item.totalAmount;

      return result;
    }, {});

    // Convert groupedSales object to array and format for display
    return Object.values(groupedSales).map((group: any) => {
      return {
        productName: `${group.productName} ${group.priceType}`,
        items: group.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
          paymentMethod: item.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          formattedSale: `${item.quantity} ${item.product.name} ${item.priceType} = ${item.totalAmount}${
            item.paymentMethod !== 'CASH'
              ? ` (${item.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        })),
        totalQuantity: group.totalQuantity,
        totalAmount: Number(group.totalAmount.toFixed(2)),
        paymentTotals: {
          cash: Number(group.paymentTotals.CASH.toFixed(2)),
          check: Number(group.paymentTotals.CHECK.toFixed(2)),
          bankTransfer: Number(group.paymentTotals.BANK_TRANSFER.toFixed(2)),
        },
      };
    });
  }

  // New method for cashier-specific total sales using cashier ID
  async getCashierTotalSales(cashierId: string, filters: TotalSalesFilterDto) {
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

    // Get all sales for the day
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
            perKiloPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Filter and map sale items
    const allSaleItems = sales.flatMap((sale) => {
      return sale.SaleItem.filter((item) => {
        // Filter by product name if specified
        if (
          filters.productName &&
          item.product &&
          !item.product.name
            .toLowerCase()
            .includes(filters.productName.toLowerCase())
        ) {
          return false;
        }

        // Filter by price type (SACK or KILO)
        if (filters.priceType === 'SACK' && !item.sackPriceId) {
          return false;
        }
        if (filters.priceType === 'KILO' && !item.perKiloPriceId) {
          return false;
        }

        // Filter by sack type if applicable
        if (
          filters.priceType === 'SACK' &&
          filters.sackType &&
          item.sackPriceId
        ) {
          if (item.sackType !== filters.sackType) {
            return false;
          }
        }

        // Filter by discount status if specified
        if (filters.isDiscounted !== undefined) {
          if (item.isDiscounted !== filters.isDiscounted) {
            return false;
          }
        }

        return true;
      }).map((item) => {
        let priceType = '';
        let totalAmount = 0;
        let unitPrice = 0;

        if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice * item.quantity;
        } else if (item.sackPriceId && item.SackPrice) {
          switch (item.sackType) {
            case 'FIFTY_KG':
              priceType = '50KG';
              break;
            case 'TWENTY_FIVE_KG':
              priceType = '25KG';
              break;
            case 'FIVE_KG':
              priceType = '5KG';
              break;
            default:
              priceType = item.sackType || 'SACK';
          }

          if (item.isSpecialPrice && item.SackPrice.specialPrice) {
            unitPrice = item.SackPrice.specialPrice.price;
          } else {
            unitPrice = item.SackPrice.price;
          }
          totalAmount = unitPrice * item.quantity;
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          totalAmount = item.discountedPrice * item.quantity;
          unitPrice = item.discountedPrice;
        }

        // Create a formatted sale item with time included
        const saleDateTime = sale.createdAt;
        const formattedTime = `${saleDateTime.getHours().toString().padStart(2, '0')}:${saleDateTime.getMinutes().toString().padStart(2, '0')}`;

        return {
          id: item.id,
          saleId: sale.id,
          quantity: item.quantity,
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          unitPrice: Number(unitPrice.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted ? item.discountedPrice : null,
          saleDate: sale.createdAt,
          formattedTime,
          formattedSale: `${item.quantity} ${item.product?.name || 'Unknown Product'} ${priceType} = ${Number(totalAmount.toFixed(2))}${
            sale.paymentMethod !== 'CASH'
              ? ` (${sale.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        };
      });
    });

    // Calculate totals and categorize by payment method
    const totalQuantity = allSaleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalAmount = allSaleItems.reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );

    // Group by payment method
    const paymentTotals = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.CHECK]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
    };

    allSaleItems.forEach((item) => {
      paymentTotals[item.paymentMethod] += item.totalAmount;
    });

    const nonCashTotal = paymentTotals.CHECK + paymentTotals.BANK_TRANSFER;
    const cashTotal = totalAmount - nonCashTotal;

    // Return formatted data for the UI
    return {
      items: allSaleItems,
      summary: {
        totalQuantity: Number(totalQuantity.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        paymentTotals: {
          cash: Number(cashTotal.toFixed(2)),
          check: Number(paymentTotals.CHECK.toFixed(2)),
          bankTransfer: Number(paymentTotals.BANK_TRANSFER.toFixed(2)),
        },
      },
    };
  }

  // New method for getting all cashier sales under a user
  async getAllCashierSalesByDate(userId: string, date?: string) {
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

    // Get sales for each cashier
    const cashierSales = await Promise.all(
      cashiers.map(async (cashier) => {
        const sales = await this.getCashierSalesWithFilter(cashier.id, {
          date,
        });
        const totalSales = await this.getCashierTotalSales(cashier.id, {
          date,
        });
        return {
          cashier: {
            id: cashier.id,
            name: cashier.name,
          },
          sales,
          totalSales,
        };
      }),
    );

    return cashierSales;
  }
}
