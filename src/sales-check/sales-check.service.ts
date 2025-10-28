import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesCheckFilterDto } from './dto/sales-check.dto';
import { TotalSalesFilterDto } from './dto/total-sales.dto';
import { PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  formatDateForClient,
  createManilaDateFilter,
} from '../utils/date.util';

@Injectable()
export class SalesCheckService {
  constructor(private prisma: PrismaService) {}

  private convertDecimalToString(value: Decimal | number): string {
    if (value instanceof Decimal) {
      return Math.ceil(value.toNumber()).toFixed(2);
    }
    return Math.ceil(Number(value)).toFixed(2);
  }

  async getSalesWithFilter(userId: string, filters: SalesCheckFilterDto) {
    // Use timezone-aware date filtering
    const dateFilter = filters.date ? createManilaDateFilter(filters.date) : {};

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
        ...(Object.keys(dateFilter).length > 0
          ? [{ createdAt: dateFilter }]
          : []),
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

    console.log(sales);

    // Process and calculate profits for each sale item
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
        let totalAmount = new Decimal(0);
        let unitPrice = new Decimal(0);

        // If price field exists, use it directly
        if ((item as any).price !== null && (item as any).price !== undefined) {
          unitPrice = (item as any).price;
          totalAmount = unitPrice;

          // Determine price type based on what's connected
          if (item.perKiloPriceId && item.perKiloPrice) {
            priceType = 'KG';
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
          } else {
            priceType = 'CUSTOM';
          }
        } else if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice.mul(item.quantity);
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
          totalAmount = unitPrice.mul(item.quantity);
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          unitPrice = item.discountedPrice.div(item.quantity);
          totalAmount = item.discountedPrice;
        }

        // Create a formatted sale item
        return {
          id: item.id,
          quantity: this.convertDecimalToString(item.quantity),
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          price: this.convertDecimalToString(item.price),
          priceType,
          unitPrice: this.convertDecimalToString(unitPrice),
          totalAmount: this.convertDecimalToString(totalAmount),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted
            ? this.convertDecimalToString(item.discountedPrice)
            : null,
          saleDate: formatDateForClient(sale.createdAt),
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
          totalQuantity: new Decimal(0),
          totalAmount: new Decimal(0),
          paymentTotals: {
            [PaymentMethod.CASH]: new Decimal(0),
            [PaymentMethod.CHECK]: new Decimal(0),
            [PaymentMethod.BANK_TRANSFER]: new Decimal(0),
          },
        };
      }

      result[key].items.push(item);
      result[key].totalQuantity = result[key].totalQuantity.add(item.quantity);
      result[key].totalAmount = result[key].totalAmount.add(item.totalAmount);

      // Add to payment method totals
      result[key].paymentTotals[item.paymentMethod] = result[key].paymentTotals[
        item.paymentMethod
      ].add(item.totalAmount);

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
          discountedPrice: item.discountedPrice,
          formattedSale: `${item.quantity} ${item.product.name} ${item.priceType} = ${item.totalAmount}${
            item.paymentMethod !== 'CASH'
              ? ` (${item.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        })),
        totalQuantity: this.convertDecimalToString(group.totalQuantity),
        totalAmount: this.convertDecimalToString(group.totalAmount),
        paymentTotals: {
          cash: this.convertDecimalToString(group.paymentTotals.CASH),
          check: this.convertDecimalToString(group.paymentTotals.CHECK),
          bankTransfer: this.convertDecimalToString(
            group.paymentTotals.BANK_TRANSFER,
          ),
        },
      };
    });
  }

  // New method for cashier-specific sales using cashier ID
  async getCashierSalesWithFilter(
    cashierId: string,
    filters: SalesCheckFilterDto,
  ) {
    // Use timezone-aware date filtering
    const dateFilter = filters.date ? createManilaDateFilter(filters.date) : {};

    // Build the query conditions for specific cashier
    const whereConditions: any = {
      AND: [
        {
          cashierId,
        },
        {
          isVoid: false,
        },
        ...(Object.keys(dateFilter).length > 0
          ? [{ createdAt: dateFilter }]
          : []),
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

    console.log(sales);

    // Process and calculate profits for each sale item
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
        let totalAmount = new Decimal(0);
        let unitPrice = new Decimal(0);

        // If price field exists, use it directly
        if ((item as any).price !== null && (item as any).price !== undefined) {
          unitPrice = (item as any).price;
          totalAmount = unitPrice;

          // Determine price type based on what's connected
          if (item.perKiloPriceId && item.perKiloPrice) {
            priceType = 'KG';
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
          } else {
            priceType = 'CUSTOM';
          }
        } else if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice.mul(item.quantity);
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
          totalAmount = unitPrice.mul(item.quantity);
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          unitPrice = item.discountedPrice.div(item.quantity);
          totalAmount = item.discountedPrice;
        }

        // Create a formatted sale item
        return {
          id: item.id,
          quantity: this.convertDecimalToString(item.quantity),
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          price: this.convertDecimalToString(item.price),
          unitPrice: this.convertDecimalToString(unitPrice),
          totalAmount: this.convertDecimalToString(totalAmount),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted
            ? this.convertDecimalToString(item.discountedPrice)
            : null,
          saleDate: formatDateForClient(sale.createdAt),
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
          totalQuantity: new Decimal(0),
          totalAmount: new Decimal(0),
          paymentTotals: {
            [PaymentMethod.CASH]: new Decimal(0),
            [PaymentMethod.CHECK]: new Decimal(0),
            [PaymentMethod.BANK_TRANSFER]: new Decimal(0),
          },
        };
      }

      result[key].items.push(item);
      result[key].totalQuantity = result[key].totalQuantity.add(item.quantity);
      result[key].totalAmount = result[key].totalAmount.add(item.totalAmount);

      // Add to payment method totals
      result[key].paymentTotals[item.paymentMethod] = result[key].paymentTotals[
        item.paymentMethod
      ].add(item.totalAmount);

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
          discountedPrice: item.discountedPrice,
          formattedSale: `${item.quantity} ${item.product.name} ${item.priceType} = ${item.totalAmount}${
            item.paymentMethod !== 'CASH'
              ? ` (${item.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        })),
        totalQuantity: this.convertDecimalToString(group.totalQuantity),
        totalAmount: this.convertDecimalToString(group.totalAmount),
        paymentTotals: {
          cash: this.convertDecimalToString(group.paymentTotals.CASH),
          check: this.convertDecimalToString(group.paymentTotals.CHECK),
          bankTransfer: this.convertDecimalToString(
            group.paymentTotals.BANK_TRANSFER,
          ),
        },
      };
    });
  }

  async getTotalSales(userId: string, filters: TotalSalesFilterDto) {
    // Use timezone-aware date filtering
    const dateFilter = filters.date ? createManilaDateFilter(filters.date) : {};

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
        ...(Object.keys(dateFilter).length > 0
          ? [{ createdAt: dateFilter }]
          : []),
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

    console.log(sales);

    // Filter and map sale items with consistent date conversion
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
        let totalAmount = new Decimal(0);
        let unitPrice = new Decimal(0);

        // If price field exists, use it directly
        if ((item as any).price !== null && (item as any).price !== undefined) {
          unitPrice = (item as any).price;
          totalAmount = unitPrice;

          // Determine price type based on what's connected
          if (item.perKiloPriceId && item.perKiloPrice) {
            priceType = 'KG';
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
          } else {
            priceType = 'CUSTOM';
          }
        } else if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice.mul(item.quantity);
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
          totalAmount = unitPrice.mul(item.quantity);
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          unitPrice = item.discountedPrice.div(item.quantity);
          totalAmount = item.discountedPrice;
        }

        // Create a formatted sale item with time included
        const saleDateTime = formatDateForClient(sale.createdAt);
        const formattedTime = `${saleDateTime.getHours().toString().padStart(2, '0')}:${saleDateTime.getMinutes().toString().padStart(2, '0')}`;

        return {
          id: item.id,
          saleId: sale.id,
          quantity: this.convertDecimalToString(item.quantity),
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          price: this.convertDecimalToString(item.price),
          unitPrice: this.convertDecimalToString(unitPrice),
          totalAmount: this.convertDecimalToString(totalAmount),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted
            ? this.convertDecimalToString(item.discountedPrice)
            : null,
          saleDate: saleDateTime,
          formattedTime,
          formattedSale: `${this.convertDecimalToString(item.quantity)} ${item.product?.name || 'Unknown Product'} ${priceType} = ${this.convertDecimalToString(totalAmount)}${
            sale.paymentMethod !== 'CASH'
              ? ` (${sale.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        };
      });
    });

    // Calculate totals and categorize by payment method
    const totalQuantity = allSaleItems.reduce(
      (sum, item) => sum.add(item.quantity),
      new Decimal(0),
    );
    const totalAmount = allSaleItems.reduce(
      (sum, item) => sum.add(item.totalAmount),
      new Decimal(0),
    );

    // Group by payment method
    const paymentTotals = {
      [PaymentMethod.CASH]: new Decimal(0),
      [PaymentMethod.CHECK]: new Decimal(0),
      [PaymentMethod.BANK_TRANSFER]: new Decimal(0),
    };

    allSaleItems.forEach((item) => {
      paymentTotals[item.paymentMethod] = paymentTotals[item.paymentMethod].add(
        item.totalAmount,
      );
    });

    const nonCashTotal = paymentTotals.CHECK.add(paymentTotals.BANK_TRANSFER);
    const cashTotal = totalAmount.sub(nonCashTotal);

    // Return formatted data for the UI
    return {
      items: allSaleItems,
      summary: {
        totalQuantity: this.convertDecimalToString(totalQuantity),
        totalAmount: this.convertDecimalToString(totalAmount),
        paymentTotals: {
          cash: this.convertDecimalToString(cashTotal),
          check: this.convertDecimalToString(paymentTotals.CHECK),
          bankTransfer: this.convertDecimalToString(
            paymentTotals.BANK_TRANSFER,
          ),
        },
      },
    };
  }

  // New method for cashier-specific total sales using cashier ID
  async getCashierTotalSales(cashierId: string, filters: TotalSalesFilterDto) {
    // Use timezone-aware date filtering
    const dateFilter = filters.date ? createManilaDateFilter(filters.date) : {};

    // Build the query conditions for specific cashier
    const whereConditions: any = {
      AND: [
        {
          cashierId,
        },
        {
          isVoid: false,
        },
        ...(Object.keys(dateFilter).length > 0
          ? [{ createdAt: dateFilter }]
          : []),
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

    console.log(sales);

    // Filter and map sale items with consistent date conversion
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
        let totalAmount = new Decimal(0);
        let unitPrice = new Decimal(0);

        // If price field exists, use it directly
        if ((item as any).price !== null && (item as any).price !== undefined) {
          unitPrice = (item as any).price;
          totalAmount = unitPrice;

          // Determine price type based on what's connected
          if (item.perKiloPriceId && item.perKiloPrice) {
            priceType = 'KG';
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
          } else {
            priceType = 'CUSTOM';
          }
        } else if (item.perKiloPriceId && item.perKiloPrice) {
          priceType = 'KG';
          unitPrice = item.perKiloPrice.price;
          totalAmount = unitPrice.mul(item.quantity);
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
          totalAmount = unitPrice.mul(item.quantity);
        } else {
          priceType = 'UNKNOWN';
        }

        // If this item is discounted, use the discounted price instead
        if (item.isDiscounted && item.discountedPrice !== null) {
          unitPrice = item.discountedPrice.div(item.quantity);
          totalAmount = item.discountedPrice;
        }

        // Create a formatted sale item with time included
        const saleDateTime = formatDateForClient(sale.createdAt);
        const formattedTime = `${saleDateTime.getHours().toString().padStart(2, '0')}:${saleDateTime.getMinutes().toString().padStart(2, '0')}`;

        return {
          id: item.id,
          saleId: sale.id,
          quantity: this.convertDecimalToString(item.quantity),
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
          },
          priceType,
          price: this.convertDecimalToString(item.price),
          unitPrice: this.convertDecimalToString(unitPrice),
          totalAmount: this.convertDecimalToString(totalAmount),
          paymentMethod: sale.paymentMethod,
          isSpecialPrice: item.isSpecialPrice,
          isDiscounted: item.isDiscounted,
          discountedPrice: item.isDiscounted
            ? this.convertDecimalToString(item.discountedPrice)
            : null,
          saleDate: saleDateTime,
          formattedTime,
          formattedSale: `${this.convertDecimalToString(item.quantity)} ${item.product?.name || 'Unknown Product'} ${priceType} = ${this.convertDecimalToString(totalAmount)}${
            sale.paymentMethod !== 'CASH'
              ? ` (${sale.paymentMethod.replace('_', ' ')})`
              : ''
          }${item.isSpecialPrice ? ' (special price)' : ''}${item.isDiscounted ? ' (discounted)' : ''}`,
        };
      });
    });

    // Calculate totals and categorize by payment method
    const totalQuantity = allSaleItems.reduce(
      (sum, item) => sum.add(item.quantity),
      new Decimal(0),
    );
    const totalAmount = allSaleItems.reduce(
      (sum, item) => sum.add(item.totalAmount),
      new Decimal(0),
    );

    // Group by payment method
    const paymentTotals = {
      [PaymentMethod.CASH]: new Decimal(0),
      [PaymentMethod.CHECK]: new Decimal(0),
      [PaymentMethod.BANK_TRANSFER]: new Decimal(0),
    };

    allSaleItems.forEach((item) => {
      paymentTotals[item.paymentMethod] = paymentTotals[item.paymentMethod].add(
        item.totalAmount,
      );
    });

    const nonCashTotal = paymentTotals.CHECK.add(paymentTotals.BANK_TRANSFER);
    const cashTotal = totalAmount.sub(nonCashTotal);

    // Return formatted data for the UI
    return {
      items: allSaleItems,
      summary: {
        totalQuantity: this.convertDecimalToString(totalQuantity),
        totalAmount: this.convertDecimalToString(totalAmount),
        paymentTotals: {
          cash: this.convertDecimalToString(cashTotal),
          check: this.convertDecimalToString(paymentTotals.CHECK),
          bankTransfer: this.convertDecimalToString(
            paymentTotals.BANK_TRANSFER,
          ),
        },
      },
    };
  }

  // New method for getting all cashier sales under a user
  async getAllCashierSalesByDate(userId: string, date?: string) {
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
