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
  stockOthers: number; // Combines OWN_CONSUMPTION, RETURN_TO_WAREHOUSE, REPACK
  total: number;
  totalPrice?: number; // For plastic products, we track total price instead of stock
}

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private convertDecimalToNumber(value: Decimal | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Math.ceil(Number(value));
  }

  private truncateProductName(name: string): string {
    // Find the first occurrence of a digit
    const match = name.match(/\d/);
    let truncated: string;

    if (match && match.index !== undefined) {
      // Get substring before the first digit, trimmed
      truncated = name.substring(0, match.index).trim();
    } else {
      // If no digit found, use the original name
      truncated = name;
    }

    // Check if there are multiple words
    const words = truncated.split(/\s+/).filter((word) => word.length > 0);

    if (words.length > 1) {
      // Create acronym from first letter of each word
      return words.map((word) => word[0].toUpperCase()).join('');
    }

    // Single word, return as is
    return truncated;
  }

  private formatStockForPrinter(
    productStocks: ProductStock[],
    totalStockSold: number,
    totalStockTransferredKahon: number,
    totalStockOthers: number,
    grandTotal: number,
    date: string,
    title: string,
    isPlastic: boolean = false,
  ): {
    lines: string[];
    totals: {
      sold: number;
      transferredKahon: number;
      others: number;
      total: number;
    };
  } {
    const lines: string[] = [];

    // Date at the top
    lines.push(`Date: ${date}`);
    lines.push('');

    // Title
    lines.push(title);
    lines.push('='.repeat(32));
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
        // Format: Sold + Kahon + Others = Total
        const parts: string[] = [];

        if (product.stockSold > 0) {
          parts.push(`${product.stockSold}`);
        }
        if (product.stockTransferredKahon > 0) {
          parts.push(`${product.stockTransferredKahon}`);
        }
        if (product.stockOthers > 0) {
          parts.push(`${product.stockOthers}`);
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
    lines.push('='.repeat(32));

    if (!isPlastic) {
      // Build total equation dynamically, excluding zero values
      const totalParts: string[] = [];

      if (totalStockSold > 0) {
        totalParts.push(`${totalStockSold}`);
      }
      if (totalStockTransferredKahon > 0) {
        totalParts.push(`${totalStockTransferredKahon}`);
      }
      if (totalStockOthers > 0) {
        totalParts.push(`${totalStockOthers}`);
      }

      const totalEquation =
        totalParts.length > 0
          ? `${totalParts.join(' + ')} = ${grandTotal}`
          : `${grandTotal}`;
      lines.push(`TOTAL = ${totalEquation}`);
    } else {
      lines.push(`TOTAL = ${grandTotal}`);
    }

    lines.push('='.repeat(32));

    return {
      lines,
      totals: {
        sold: totalStockSold,
        transferredKahon: totalStockTransferredKahon,
        others: totalStockOthers,
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

    // Get all sales for the date - includes both SackPrice and PerKiloPrice
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

    // Get all transfers for the date with all types
    const transfers = await this.prisma.transfer.findMany({
      where: {
        cashierId,
        createdAt: dateFilter,
      },
      include: {
        product: true,
      },
    });

    // Aggregate stock data by product
    const productStockMap = new Map<string, ProductStock>();

    // Helper function to get sack type suffix
    const getSackTypeSuffix = (sackType: string | null): string => {
      if (!sackType) return '';
      switch (sackType) {
        case 'FIFTY_KG':
          return ' 50KG';
        case 'TWENTY_FIVE_KG':
          return ' 25KG';
        case 'FIVE_KG':
          return ' 5KG';
        default:
          return '';
      }
    };

    // Process sales - only include SackPrice for regular/asin, allow PerKiloPrice for plastic
    sales.forEach((sale) => {
      sale.SaleItem.forEach((item) => {
        const rawProductName = item.product.name;
        const isPlasticProduct = rawProductName
          .toLowerCase()
          .includes('plastic');

        // Skip PerKiloPrice items unless they are plastic products
        if (!item.sackType && !isPlasticProduct) return;

        const truncatedName = this.truncateProductName(rawProductName);
        const sackTypeSuffix = getSackTypeSuffix(item.sackType);
        const productName = truncatedName + sackTypeSuffix;
        const quantity = this.convertDecimalToNumber(item.quantity);
        const price = item.price ? this.convertDecimalToNumber(item.price) : 0;
        // For plastic products, price is already the final price, no need to multiply
        const totalPrice = isPlasticProduct
          ? price
          : Math.ceil(quantity * price);

        if (!productStockMap.has(productName)) {
          productStockMap.set(productName, {
            productName,
            stockSold: 0,
            stockTransferredKahon: 0,
            stockOthers: 0,
            total: 0,
            totalPrice: 0,
          });
        }

        const productStock = productStockMap.get(productName)!;
        productStock.stockSold += quantity;
        productStock.total += quantity;
        productStock.totalPrice = Math.ceil(
          (productStock.totalPrice || 0) + totalPrice,
        );
      });
    });

    // Process transfers - all types
    // Now using product relationship instead of parsing transfer names
    transfers.forEach((transfer) => {
      // Skip transfers without product link (legacy data)
      if (!transfer.product) return;

      const transferProductName = transfer.product.name;
      const isPlasticTransfer = transferProductName
        .toLowerCase()
        .includes('plastic');

      // Skip PerKiloPrice items unless they are plastic products
      if (!transfer.sackType && !isPlasticTransfer) return;

      const truncatedName = this.truncateProductName(transferProductName);
      const sackTypeSuffix = getSackTypeSuffix(transfer.sackType);
      const productName = truncatedName + sackTypeSuffix;
      const quantity = this.convertDecimalToNumber(transfer.quantity);

      if (!productStockMap.has(productName)) {
        productStockMap.set(productName, {
          productName,
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOthers: 0,
          total: 0,
          totalPrice: 0,
        });
      }

      const productStock = productStockMap.get(productName)!;

      if (transfer.type === 'KAHON') {
        productStock.stockTransferredKahon += quantity;
      } else {
        // All other types (OWN_CONSUMPTION, RETURN_TO_WAREHOUSE, REPACK) go to stockOthers
        productStock.stockOthers += quantity;
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
          acc.stockOthers += product.stockOthers;
          acc.total += product.total;
          return acc;
        },
        {
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOthers: 0,
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
      regularTotals.stockOthers,
      regularTotals.total,
      targetDate,
      'REGULAR PRODUCTS STOCK REPORT',
    );

    const asinFormatted = this.formatStockForPrinter(
      asinProducts,
      asinTotals.stockSold,
      asinTotals.stockTransferredKahon,
      asinTotals.stockOthers,
      asinTotals.total,
      targetDate,
      'ASIN PRODUCTS STOCK REPORT',
    );

    const plasticFormatted = this.formatStockForPrinter(
      plasticProducts,
      plasticTotals.stockSold,
      plasticTotals.stockTransferredKahon,
      plasticTotals.stockOthers,
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

    // Get all sales for the date across all cashiers - includes both SackPrice and PerKiloPrice
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

    // Get all transfers for the date with all types
    const transfers = await this.prisma.transfer.findMany({
      where: {
        cashierId: {
          in: cashierIds,
        },
        createdAt: dateFilter,
      },
      include: {
        product: true,
      },
    });

    // Aggregate stock data by product
    const productStockMap = new Map<string, ProductStock>();

    // Helper function to get sack type suffix
    const getSackTypeSuffix = (sackType: string | null): string => {
      if (!sackType) return '';
      switch (sackType) {
        case 'FIFTY_KG':
          return ' 50KG';
        case 'TWENTY_FIVE_KG':
          return ' 25KG';
        case 'FIVE_KG':
          return ' 5KG';
        default:
          return '';
      }
    };

    // Process sales - only include SackPrice for regular/asin, allow PerKiloPrice for plastic
    sales.forEach((sale) => {
      sale.SaleItem.forEach((item) => {
        const rawProductName = item.product.name;
        const isPlasticProduct = rawProductName
          .toLowerCase()
          .includes('plastic');

        // Skip PerKiloPrice items unless they are plastic products
        if (!item.sackType && !isPlasticProduct) return;

        const truncatedName = this.truncateProductName(rawProductName);
        const sackTypeSuffix = getSackTypeSuffix(item.sackType);
        const productName = truncatedName + sackTypeSuffix;
        const quantity = this.convertDecimalToNumber(item.quantity);
        const price = item.price ? this.convertDecimalToNumber(item.price) : 0;
        // For plastic products, price is already the final price, no need to multiply
        const totalPrice = isPlasticProduct
          ? price
          : Math.ceil(quantity * price);

        if (!productStockMap.has(productName)) {
          productStockMap.set(productName, {
            productName,
            stockSold: 0,
            stockTransferredKahon: 0,
            stockOthers: 0,
            total: 0,
            totalPrice: 0,
          });
        }

        const productStock = productStockMap.get(productName)!;
        productStock.stockSold += quantity;
        productStock.total += quantity;
        productStock.totalPrice = Math.ceil(
          (productStock.totalPrice || 0) + totalPrice,
        );
      });
    });

    // Process transfers - all types
    // Now using product relationship instead of parsing transfer names
    transfers.forEach((transfer) => {
      // Skip transfers without product link (legacy data)
      if (!transfer.product) return;

      const rawProductName = transfer.product.name;
      const isPlasticProduct = rawProductName.toLowerCase().includes('plastic');

      // Skip PerKiloPrice items unless they are plastic products
      if (!transfer.sackType && !isPlasticProduct) return;

      const truncatedName = this.truncateProductName(rawProductName);
      const sackTypeSuffix = getSackTypeSuffix(transfer.sackType);
      const productName = truncatedName + sackTypeSuffix;
      const quantity = this.convertDecimalToNumber(transfer.quantity);

      if (!productStockMap.has(productName)) {
        productStockMap.set(productName, {
          productName,
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOthers: 0,
          total: 0,
          totalPrice: 0,
        });
      }

      const productStock = productStockMap.get(productName)!;

      if (transfer.type === 'KAHON') {
        productStock.stockTransferredKahon += quantity;
      } else {
        // All other types (OWN_CONSUMPTION, RETURN_TO_WAREHOUSE, REPACK) go to stockOthers
        productStock.stockOthers += quantity;
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
          acc.stockOthers += product.stockOthers;
          acc.total += product.total;
          return acc;
        },
        {
          stockSold: 0,
          stockTransferredKahon: 0,
          stockOthers: 0,
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
      regularTotals.stockOthers,
      regularTotals.total,
      targetDate,
      'REGULAR PRODUCTS STOCK REPORT',
    );

    const asinFormatted = this.formatStockForPrinter(
      asinProducts,
      asinTotals.stockSold,
      asinTotals.stockTransferredKahon,
      asinTotals.stockOthers,
      asinTotals.total,
      targetDate,
      'ASIN PRODUCTS STOCK REPORT',
    );

    const plasticFormatted = this.formatStockForPrinter(
      plasticProducts,
      plasticTotals.stockSold,
      plasticTotals.stockTransferredKahon,
      plasticTotals.stockOthers,
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
