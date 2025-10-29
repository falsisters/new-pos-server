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
  stockTransferred: number;
  total: number;
}

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private convertDecimalToNumber(value: Decimal | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private formatStockForPrinter(
    productStocks: ProductStock[],
    totalStockSold: number,
    totalStockTransferred: number,
    grandTotal: number,
    date: string,
    title: string,
  ): {
    lines: string[];
    totals: { sold: number; transferred: number; total: number };
  } {
    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push('='.repeat(40));
    lines.push('');

    // Product details
    productStocks.forEach((product) => {
      lines.push(
        `${product.productName} = ${product.stockSold} + ${product.stockTransferred} = ${product.total}`,
      );
    });

    // Overall totals
    lines.push('');
    lines.push('='.repeat(40));
    lines.push(
      `TOTAL = ${totalStockSold} + ${totalStockTransferred} = ${grandTotal}`,
    );
    lines.push('='.repeat(40));
    lines.push('');
    lines.push(`Date: ${date}`);

    return {
      lines,
      totals: {
        sold: totalStockSold,
        transferred: totalStockTransferred,
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

    // Get all sales for the date
    const sales = await this.prisma.sale.findMany({
      where: {
        cashierId,
        createdAt: dateFilter,
        isVoid: false,
      },
      include: {
        SaleItem: {
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
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
        const productName = item.product.name;
        const quantity = this.convertDecimalToNumber(item.quantity);

        if (!productStockMap.has(productName)) {
          productStockMap.set(productName, {
            productName,
            stockSold: 0,
            stockTransferred: 0,
            total: 0,
          });
        }

        const productStock = productStockMap.get(productName)!;
        productStock.stockSold += quantity;
        productStock.total += quantity;
      });
    });

    // Process transfers
    transfers.forEach((transfer) => {
      const productName = transfer.name;
      const quantity = this.convertDecimalToNumber(transfer.quantity);

      if (!productStockMap.has(productName)) {
        productStockMap.set(productName, {
          productName,
          stockSold: 0,
          stockTransferred: 0,
          total: 0,
        });
      }

      const productStock = productStockMap.get(productName)!;
      productStock.stockTransferred += quantity;
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
          acc.stockTransferred += product.stockTransferred;
          acc.total += product.total;
          return acc;
        },
        { stockSold: 0, stockTransferred: 0, total: 0 },
      );
    };

    const regularTotals = calculateTotals(regularProducts);
    const asinTotals = calculateTotals(asinProducts);
    const plasticTotals = calculateTotals(plasticProducts);

    // Format for printer
    const regularFormatted = this.formatStockForPrinter(
      regularProducts,
      regularTotals.stockSold,
      regularTotals.stockTransferred,
      regularTotals.total,
      targetDate,
      'REGULAR PRODUCTS STOCK REPORT',
    );

    const asinFormatted = this.formatStockForPrinter(
      asinProducts,
      asinTotals.stockSold,
      asinTotals.stockTransferred,
      asinTotals.total,
      targetDate,
      'ASIN PRODUCTS STOCK REPORT',
    );

    const plasticFormatted = this.formatStockForPrinter(
      plasticProducts,
      plasticTotals.stockSold,
      plasticTotals.stockTransferred,
      plasticTotals.total,
      targetDate,
      'PLASTIC PRODUCTS STOCK REPORT',
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

    // Get all sales for the date across all cashiers
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
          include: {
            product: true,
            SackPrice: true,
            perKiloPrice: true,
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
        const productName = item.product.name;
        const quantity = this.convertDecimalToNumber(item.quantity);

        if (!productStockMap.has(productName)) {
          productStockMap.set(productName, {
            productName,
            stockSold: 0,
            stockTransferred: 0,
            total: 0,
          });
        }

        const productStock = productStockMap.get(productName)!;
        productStock.stockSold += quantity;
        productStock.total += quantity;
      });
    });

    // Process transfers
    transfers.forEach((transfer) => {
      const productName = transfer.name;
      const quantity = this.convertDecimalToNumber(transfer.quantity);

      if (!productStockMap.has(productName)) {
        productStockMap.set(productName, {
          productName,
          stockSold: 0,
          stockTransferred: 0,
          total: 0,
        });
      }

      const productStock = productStockMap.get(productName)!;
      productStock.stockTransferred += quantity;
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
          acc.stockTransferred += product.stockTransferred;
          acc.total += product.total;
          return acc;
        },
        { stockSold: 0, stockTransferred: 0, total: 0 },
      );
    };

    const regularTotals = calculateTotals(regularProducts);
    const asinTotals = calculateTotals(asinProducts);
    const plasticTotals = calculateTotals(plasticProducts);

    // Format for printer
    const regularFormatted = this.formatStockForPrinter(
      regularProducts,
      regularTotals.stockSold,
      regularTotals.stockTransferred,
      regularTotals.total,
      targetDate,
      'REGULAR PRODUCTS STOCK REPORT',
    );

    const asinFormatted = this.formatStockForPrinter(
      asinProducts,
      asinTotals.stockSold,
      asinTotals.stockTransferred,
      asinTotals.total,
      targetDate,
      'ASIN PRODUCTS STOCK REPORT',
    );

    const plasticFormatted = this.formatStockForPrinter(
      plasticProducts,
      plasticTotals.stockSold,
      plasticTotals.stockTransferred,
      plasticTotals.total,
      targetDate,
      'PLASTIC PRODUCTS STOCK REPORT',
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
