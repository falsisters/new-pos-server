import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StockStatisticsFilterDto } from './dto/stock-statistics.dto';
import {
  createManilaDateFilter,
  getCurrentManilaDate,
} from 'src/utils/date.util';
import { Decimal } from '@prisma/client/runtime/library';

export interface ProductStock {
  productName: string;
  stockSold: number;
  stockTransferredKahon: number;
  stockOwnConsumption: number;
  total: number;
  totalPrice?: number; // For plastic products, we track total price instead of stock
}

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private convertDecimalToNumber(value: Decimal | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private truncateProductName(name: string): string {
    // Find the first occurrence of a digit
    const match = name.match(/\d/);
    if (match && match.index !== undefined) {
      // Return the substring before the first digit, trimmed
      return name.substring(0, match.index).trim();
    }
    // If no digit found, return the original name
    return name;
  }

  private formatStockForPrinter(
    productStocks: ProductStock[],
    totalStockSold: number,
    totalStockTransferredKahon: number,
    totalStockOwnConsumption: number,
    grandTotal: number,
    date: string,
    title: string,
    isPlastic: boolean = false,
  ): {
    lines: string[];
    totals: {
      sold: number;
      transferredKahon: number;
      ownConsumption: number;
      total: number;
    };
  } {
    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push('='.repeat(40));
    lines.push('');

    // Product details
    productStocks.forEach((product) => {
      if (isPlastic) {
        // For plastic products, only show total price
        lines.push(
          `${product.productName} = ₱${product.totalPrice?.toFixed(2) || '0.00'}`,
        );
      } else {
        // Build the equation dynamically, excluding zero values
        const parts: string[] = [];

        if (product.stockSold > 0) {
          parts.push(`${product.stockSold}`);
        }
        if (product.stockTransferredKahon > 0) {
          parts.push(`${product.stockTransferredKahon}`);
        }
        if (product.stockOwnConsumption > 0) {
          parts.push(`${product.stockOwnConsumption}`);
        }

        const equation =
          parts.length > 0
            ? `${parts.join(' + ')} = ${product.total}`
            : `${product.total}`;
        lines.push(`${product.productName} = ${equation}`);
      }
    });

    // Overall totals
    lines.push('');
    lines.push('='.repeat(40));

    if (!isPlastic) {
      // Build total equation dynamically, excluding zero values
      const totalParts: string[] = [];

      if (totalStockSold > 0) {
        totalParts.push(`${totalStockSold}`);
      }
      if (totalStockTransferredKahon > 0) {
        totalParts.push(`${totalStockTransferredKahon}`);
      }
      if (totalStockOwnConsumption > 0) {
        totalParts.push(`${totalStockOwnConsumption}`);
      }

      const totalEquation =
        totalParts.length > 0
          ? `${totalParts.join(' + ')} = ${grandTotal}`
          : `${grandTotal}`;
      lines.push(`TOTAL = ${totalEquation}`);
    } else {
      lines.push(`TOTAL = ${grandTotal}`);
    }

    lines.push('='.repeat(40));
    lines.push('');
    lines.push(`Date: ${date}`);

    return {
      lines,
      totals: {
        sold: totalStockSold,
        transferredKahon: totalStockTransferredKahon,
        ownConsumption: totalStockOwnConsumption,
        total: grandTotal,
      },
    };
  }

  async getStockStatistics(
    cashierId: string,
    filters: StockStatisticsFilterDto,
  ) {
    // Use timezone-aware date filtering
    const targetDate = filters.date || getCurrentManilaDate();
    const dateFilter = createManilaDateFilter(targetDate);

    // Get all sales for the date - only SackPrice sales
    const sales = await this.prisma.sale.findMany({
      where: {
        cashierId,
        createdAt: dateFilter,
        isVoid: false,
      },
      include: {
        SaleItem: {
          where: {
            sackPriceId: {
              not: null, // Only include items with SackPrice (excludes PerKilo)
            },
          },
          include: {
            product: true,
            SackPrice: true,
          },
        },
      },
    });

    // Get all transfers for the date with specific types
    const transfers = await this.prisma.transfer.findMany({
      where: {
        cashierId,
        createdAt: dateFilter,
        type: {
          in: ['OWN_CONSUMPTION', 'KAHON'],
        },
      },
    });

    // Aggregate stock data by product
    const productStockMap = new Map<string, ProductStock>();

    // Process sales
    sales.forEach((sale) => {
      sale.SaleItem.forEach((item) => {
        const rawProductName = item.product.name;
        const productName = this.truncateProductName(rawProductName);
        const quantity = this.convertDecimalToNumber(item.quantity);
        const price = item.price ? this.convertDecimalToNumber(item.price) : 0;
        const totalPrice = quantity * price;

        if (!productStockMap.has(productName)) {
          productStockMap.set(productName, {
            productName,
            stockSold: 0,
            stockTransferredKahon: 0,
            stockOwnConsumption: 0,
            total: 0,
            totalPrice: 0,
          });
        }

        const productStock = productStockMap.get(productName)!;
        productStock.stockSold += quantity;
        productStock.total += quantity;
        productStock.totalPrice = (productStock.totalPrice || 0) + totalPrice;
      });
    });

    // Process transfers - separate KAHON and OWN_CONSUMPTION
    transfers.forEach((transfer) => {
      const rawProductName = transfer.name;
      const productName = this.truncateProductName(rawProductName);
      const quantity = this.convertDecimalToNumber(transfer.quantity);

      if (!productStockMap.has(productName)) {
        productStockMap.set(productName, {
          productName,
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOwnConsumption: 0,
          total: 0,
          totalPrice: 0,
        });
      }

      const productStock = productStockMap.get(productName)!;

      if (transfer.type === 'KAHON') {
        productStock.stockTransferredKahon += quantity;
      } else if (transfer.type === 'OWN_CONSUMPTION') {
        productStock.stockOwnConsumption += quantity;
      }

      productStock.total += quantity;
    });

    // Convert map to array and sort by product name
    const allProducts = Array.from(productStockMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName),
    );

    // Separate products
    const asinProducts = allProducts.filter((p) =>
      p.productName.toLowerCase().includes('asin'),
    );
    const plasticProducts = allProducts.filter((p) =>
      p.productName.toLowerCase().includes('plastic'),
    );
    const regularProducts = allProducts.filter(
      (p) =>
        !p.productName.toLowerCase().includes('asin') &&
        !p.productName.toLowerCase().includes('plastic'),
    );

    // Calculate totals for each category
    const calculateTotals = (products: ProductStock[]) => {
      return products.reduce(
        (acc, product) => {
          acc.stockSold += product.stockSold;
          acc.stockTransferredKahon += product.stockTransferredKahon;
          acc.stockOwnConsumption += product.stockOwnConsumption;
          acc.total += product.total;
          return acc;
        },
        {
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOwnConsumption: 0,
          total: 0,
        },
      );
    };

    const regularTotals = calculateTotals(regularProducts);
    const asinTotals = calculateTotals(asinProducts);
    const plasticTotals = calculateTotals(plasticProducts);

    // Format for printer
    const regularFormatted = this.formatStockForPrinter(
      regularProducts,
      regularTotals.stockSold,
      regularTotals.stockTransferredKahon,
      regularTotals.stockOwnConsumption,
      regularTotals.total,
      targetDate,
      'REGULAR PRODUCTS STOCK REPORT',
    );

    const asinFormatted = this.formatStockForPrinter(
      asinProducts,
      asinTotals.stockSold,
      asinTotals.stockTransferredKahon,
      asinTotals.stockOwnConsumption,
      asinTotals.total,
      targetDate,
      'ASIN PRODUCTS STOCK REPORT',
    );

    const plasticFormatted = this.formatStockForPrinter(
      plasticProducts,
      plasticTotals.stockSold,
      plasticTotals.stockTransferredKahon,
      plasticTotals.stockOwnConsumption,
      plasticTotals.total,
      targetDate,
      'PLASTIC PRODUCTS STOCK REPORT',
      true, // isPlastic = true
    );

    return {
      regular: regularFormatted,
      asin: asinFormatted,
      plastic: plasticFormatted,
      summary: {
        regular: {
          products: regularProducts,
          totals: regularTotals,
        },
        asin: {
          products: asinProducts,
          totals: asinTotals,
        },
        plastic: {
          products: plasticProducts,
          totals: plasticTotals,
        },
        date: targetDate,
      },
    };
  }

  async getStockStatisticsByUser(
    userId: string,
    filters: StockStatisticsFilterDto,
  ) {
    // Use timezone-aware date filtering
    const targetDate = filters.date || getCurrentManilaDate();
    const dateFilter = createManilaDateFilter(targetDate);

    // Get all cashiers for this user
    const cashiers = await this.prisma.cashier.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    const cashierIds = cashiers.map((cashier) => cashier.id);

    // Get all sales for the date across all cashiers - only SackPrice sales
    const sales = await this.prisma.sale.findMany({
      where: {
        cashierId: {
          in: cashierIds,
        },
        createdAt: dateFilter,
        isVoid: false,
      },
      include: {
        SaleItem: {
          where: {
            sackPriceId: {
              not: null, // Only include items with SackPrice (excludes PerKilo)
            },
          },
          include: {
            product: true,
            SackPrice: true,
          },
        },
      },
    });

    // Get all transfers for the date with specific types
    const transfers = await this.prisma.transfer.findMany({
      where: {
        cashierId: {
          in: cashierIds,
        },
        createdAt: dateFilter,
        type: {
          in: ['OWN_CONSUMPTION', 'KAHON'],
        },
      },
    });

    // Aggregate stock data by product
    const productStockMap = new Map<string, ProductStock>();

    // Process sales
    sales.forEach((sale) => {
      sale.SaleItem.forEach((item) => {
        const rawProductName = item.product.name;
        const productName = this.truncateProductName(rawProductName);
        const quantity = this.convertDecimalToNumber(item.quantity);
        const price = item.price ? this.convertDecimalToNumber(item.price) : 0;
        const totalPrice = quantity * price;

        if (!productStockMap.has(productName)) {
          productStockMap.set(productName, {
            productName,
            stockSold: 0,
            stockTransferredKahon: 0,
            stockOwnConsumption: 0,
            total: 0,
            totalPrice: 0,
          });
        }

        const productStock = productStockMap.get(productName)!;
        productStock.stockSold += quantity;
        productStock.total += quantity;
        productStock.totalPrice = (productStock.totalPrice || 0) + totalPrice;
      });
    });

    // Process transfers - separate KAHON and OWN_CONSUMPTION
    transfers.forEach((transfer) => {
      const rawProductName = transfer.name;
      const productName = this.truncateProductName(rawProductName);
      const quantity = this.convertDecimalToNumber(transfer.quantity);

      if (!productStockMap.has(productName)) {
        productStockMap.set(productName, {
          productName,
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOwnConsumption: 0,
          total: 0,
          totalPrice: 0,
        });
      }

      const productStock = productStockMap.get(productName)!;

      if (transfer.type === 'KAHON') {
        productStock.stockTransferredKahon += quantity;
      } else if (transfer.type === 'OWN_CONSUMPTION') {
        productStock.stockOwnConsumption += quantity;
      }

      productStock.total += quantity;
    });

    // Convert map to array and sort by product name
    const allProducts = Array.from(productStockMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName),
    );

    // Separate products
    const asinProducts = allProducts.filter((p) =>
      p.productName.toLowerCase().includes('asin'),
    );
    const plasticProducts = allProducts.filter((p) =>
      p.productName.toLowerCase().includes('plastic'),
    );
    const regularProducts = allProducts.filter(
      (p) =>
        !p.productName.toLowerCase().includes('asin') &&
        !p.productName.toLowerCase().includes('plastic'),
    );

    // Calculate totals for each category
    const calculateTotals = (products: ProductStock[]) => {
      return products.reduce(
        (acc, product) => {
          acc.stockSold += product.stockSold;
          acc.stockTransferredKahon += product.stockTransferredKahon;
          acc.stockOwnConsumption += product.stockOwnConsumption;
          acc.total += product.total;
          return acc;
        },
        {
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOwnConsumption: 0,
          total: 0,
        },
      );
    };

    const regularTotals = calculateTotals(regularProducts);
    const asinTotals = calculateTotals(asinProducts);
    const plasticTotals = calculateTotals(plasticProducts);

    // Format for printer
    const regularFormatted = this.formatStockForPrinter(
      regularProducts,
      regularTotals.stockSold,
      regularTotals.stockTransferredKahon,
      regularTotals.stockOwnConsumption,
      regularTotals.total,
      targetDate,
      'REGULAR PRODUCTS STOCK REPORT',
    );

    const asinFormatted = this.formatStockForPrinter(
      asinProducts,
      asinTotals.stockSold,
      asinTotals.stockTransferredKahon,
      asinTotals.stockOwnConsumption,
      asinTotals.total,
      targetDate,
      'ASIN PRODUCTS STOCK REPORT',
    );

    const plasticFormatted = this.formatStockForPrinter(
      plasticProducts,
      plasticTotals.stockSold,
      plasticTotals.stockTransferredKahon,
      plasticTotals.stockOwnConsumption,
      plasticTotals.total,
      targetDate,
      'PLASTIC PRODUCTS STOCK REPORT',
      true, // isPlastic = true
    );

    return {
      regular: regularFormatted,
      asin: asinFormatted,
      plastic: plasticFormatted,
      summary: {
        regular: {
          products: regularProducts,
          totals: regularTotals,
        },
        asin: {
          products: asinProducts,
          totals: asinTotals,
        },
        plastic: {
          products: plasticProducts,
          totals: plasticTotals,
        },
        date: targetDate,
      },
    };
  }
}
