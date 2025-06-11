import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class DatabaseService {
  constructor(private prisma: PrismaService) {}

  async clearDatabase(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Clear tables in proper order to avoid foreign key constraints
      // Keep User, Cashier, Product, SackPrice, SpecialPrice, PerKiloPrice, Customer

      await tx.expenseItems.deleteMany({ where: { expenseList: { userId } } });
      await tx.expenseList.deleteMany({ where: { userId } });
      await tx.orderItem.deleteMany({ where: { order: { userId } } });
      await tx.order.deleteMany({ where: { userId } });
      await tx.bills.deleteMany({ where: { billCount: { userId } } });
      await tx.billCount.deleteMany({ where: { userId } });
      await tx.attachment.deleteMany({ where: { userId } });
      
      // Updated: Clear inventory data via cashier relationship
      await tx.inventoryCell.deleteMany({
        where: { inventoryRow: { inventorySheet: { inventory: { cashier: { userId } } } } },
      });
      await tx.inventoryRow.deleteMany({
        where: { inventorySheet: { inventory: { cashier: { userId } } } },
      });
      await tx.inventorySheet.deleteMany({ where: { inventory: { cashier: { userId } } } });
      await tx.inventory.deleteMany({ where: { cashier: { userId } } });
      
      // Updated: Clear kahon data via cashier relationship
      await tx.cell.deleteMany({
        where: { row: { sheet: { kahon: { cashier: { userId } } } } },
      });
      await tx.row.deleteMany({ where: { sheet: { kahon: { cashier: { userId } } } } });
      await tx.sheet.deleteMany({ where: { kahon: { cashier: { userId } } } });
      await tx.kahonItem.deleteMany({ where: { kahon: { cashier: { userId } } } });
      await tx.kahon.deleteMany({ where: { cashier: { userId } } });
      
      await tx.transfer.deleteMany({ where: { cashier: { userId } } });
      await tx.deliveryItem.deleteMany({
        where: { delivery: { cashier: { userId } } },
      });
      await tx.delivery.deleteMany({ where: { cashier: { userId } } });
      await tx.saleItem.deleteMany({
        where: { sale: { cashier: { userId } } },
      });
      await tx.sale.deleteMany({ where: { cashier: { userId } } });
      await tx.shiftEmployee.deleteMany({
        where: { shift: { cashier: { userId } } },
      });
      await tx.shift.deleteMany({ where: { cashier: { userId } } });
      await tx.employee.deleteMany({ where: { userId } });

      return { message: 'Database cleared successfully' };
    });
  }

  async exportDatabase(userId: string): Promise<string> {
    // Fetch all data for the user
    const [
      sales,
      deliveries,
      transfers,
      employees,
      shifts,
      kahons,
      inventories,
      orders,
      expenses,
      billCounts,
      attachments,
    ] = await Promise.all([
      this.prisma.sale.findMany({
        where: { cashier: { userId } },
        include: {
          cashier: true,
          SaleItem: {
            include: {
              product: true,
              SackPrice: true,
              perKiloPrice: true,
            },
          },
        },
      }),
      this.prisma.delivery.findMany({
        where: { cashier: { userId } },
        include: {
          cashier: true,
          DeliveryItem: {
            include: {
              product: true,
              SackPrice: true,
              perKiloPrice: true,
            },
          },
        },
      }),
      this.prisma.transfer.findMany({
        where: { cashier: { userId } },
        include: { cashier: true },
      }),
      this.prisma.employee.findMany({
        where: { userId },
        include: {
          ShiftEmployee: {
            include: { shift: true },
          },
        },
      }),
      this.prisma.shift.findMany({
        where: { cashier: { userId } },
        include: {
          cashier: true,
          employee: {
            include: { employee: true },
          },
        },
      }),
      // Updated: Fetch kahons via cashier relationship
      this.prisma.kahon.findMany({
        where: { cashier: { userId } },
        include: {
          cashier: { select: { name: true } },
          KahonItems: true,
          Sheets: {
            include: {
              Rows: {
                include: { Cells: true },
              },
            },
          },
        },
      }),
      // Updated: Fetch inventories via cashier relationship
      this.prisma.inventory.findMany({
        where: { cashier: { userId } },
        include: {
          cashier: { select: { name: true } },
          InventorySheet: {
            include: {
              Rows: {
                include: { Cells: true },
              },
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where: { userId },
        include: {
          customer: true,
          OrderItem: {
            include: {
              product: true,
              SackPrice: true,
              perKiloPrice: true,
            },
          },
        },
      }),
      this.prisma.expenseList.findMany({
        where: { userId },
        include: { ExpenseItems: true },
      }),
      this.prisma.billCount.findMany({
        where: { userId },
        include: { Bills: true },
      }),
      this.prisma.attachment.findMany({
        where: { userId },
      }),
    ]);

    // Create CSV data
    const csvData = this.formatDataForCSV({
      sales,
      deliveries,
      transfers,
      employees,
      shifts,
      kahons,
      inventories,
      orders,
      expenses,
      billCounts,
      attachments,
    });

    return csvData;
  }

  private formatDataForCSV(data: any): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'type', title: 'Type' },
        { id: 'id', title: 'ID' },
        { id: 'date', title: 'Date' },
        { id: 'cashier', title: 'Cashier' },
        { id: 'customer', title: 'Customer' },
        { id: 'product', title: 'Product' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'amount', title: 'Amount' },
        { id: 'paymentMethod', title: 'Payment Method' },
        { id: 'status', title: 'Status' },
        { id: 'details', title: 'Details' },
      ],
    });

    const records = [];

    // Sales data
    data.sales.forEach((sale) => {
      sale.SaleItem.forEach((item) => {
        records.push({
          type: 'Sale',
          id: sale.id,
          date: sale.createdAt.toISOString(),
          cashier: sale.cashier.name,
          customer: '',
          product: item.product.name,
          quantity: item.quantity,
          amount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          status: 'Completed',
          details: `Discounted: ${item.isDiscounted}, Special Price: ${item.isSpecialPrice}`,
        });
      });
    });

    // Deliveries data
    data.deliveries.forEach((delivery) => {
      delivery.DeliveryItem.forEach((item) => {
        records.push({
          type: 'Delivery',
          id: delivery.id,
          date: delivery.createdAt.toISOString(),
          cashier: delivery.cashier.name,
          customer: delivery.driverName,
          product: item.product.name,
          quantity: item.quantity,
          amount: '',
          paymentMethod: '',
          status: 'Delivered',
          details: `Delivery Start: ${delivery.deliveryTimeStart.toISOString()}`,
        });
      });
    });

    // Orders data
    data.orders.forEach((order) => {
      order.OrderItem.forEach((item) => {
        records.push({
          type: 'Order',
          id: order.id,
          date: order.createdAt.toISOString(),
          cashier: '',
          customer: order.customer.name,
          product: item.product.name,
          quantity: item.quantity,
          amount: order.totalPrice,
          paymentMethod: '',
          status: order.status,
          details: `Customer Email: ${order.customer.email}`,
        });
      });
    });

    // Transfers data
    data.transfers.forEach((transfer) => {
      records.push({
        type: 'Transfer',
        id: transfer.id,
        date: transfer.createdAt.toISOString(),
        cashier: transfer.cashier.name,
        customer: '',
        product: transfer.name,
        quantity: transfer.quantity,
        amount: '',
        paymentMethod: '',
        status: transfer.type,
        details: `Transfer Type: ${transfer.type}`,
      });
    });

    // Updated: Kahon data with cashier info
    data.kahons.forEach((kahon) => {
      kahon.KahonItems.forEach((item) => {
        records.push({
          type: 'Kahon Item',
          id: kahon.id,
          date: item.createdAt.toISOString(),
          cashier: kahon.cashier.name,
          customer: '',
          product: item.name,
          quantity: item.quantity,
          amount: '',
          paymentMethod: '',
          status: 'Active',
          details: `Kahon: ${kahon.name}`,
        });
      });
    });

    // Updated: Inventory data with cashier info
    data.inventories.forEach((inventory) => {
      inventory.InventorySheet.forEach((sheet) => {
        sheet.Rows.forEach((row) => {
          if (row.isItemRow && row.itemId) {
            records.push({
              type: 'Inventory Item',
              id: inventory.id,
              date: row.createdAt.toISOString(),
              cashier: inventory.cashier.name,
              customer: '',
              product: `${inventory.name} Item`,
              quantity: '',
              amount: '',
              paymentMethod: '',
              status: 'Active',
              details: `Inventory: ${inventory.name}, Sheet: ${sheet.name}`,
            });
          }
        });
      });
    });

    // Expenses data
    data.expenses.forEach((expenseList) => {
      expenseList.ExpenseItems.forEach((item) => {
        records.push({
          type: 'Expense',
          id: expenseList.id,
          date: expenseList.createdAt.toISOString(),
          cashier: '',
          customer: '',
          product: item.name,
          quantity: '',
          amount: item.amount,
          paymentMethod: '',
          status: 'Expense',
          details: 'Business Expense',
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }
}
