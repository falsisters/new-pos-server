import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createObjectCsvStringifier } from 'csv-writer';
import JSZip from 'jszip';
import {
  convertToManilaTime,
  parseManilaDateToUTCRange,
} from 'src/utils/date.util';

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
        where: {
          inventoryRow: {
            inventorySheet: { inventory: { cashier: { userId } } },
          },
        },
      });
      await tx.inventoryRow.deleteMany({
        where: { inventorySheet: { inventory: { cashier: { userId } } } },
      });
      await tx.inventorySheet.deleteMany({
        where: { inventory: { cashier: { userId } } },
      });
      await tx.inventory.deleteMany({ where: { cashier: { userId } } });

      // Updated: Clear kahon data via cashier relationship
      await tx.cell.deleteMany({
        where: { row: { sheet: { kahon: { cashier: { userId } } } } },
      });
      await tx.row.deleteMany({
        where: { sheet: { kahon: { cashier: { userId } } } },
      });
      await tx.sheet.deleteMany({ where: { kahon: { cashier: { userId } } } });
      await tx.kahonItem.deleteMany({
        where: { kahon: { cashier: { userId } } },
      });
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

  async exportDatabase(userId: string): Promise<Buffer> {
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

    // Create zip file with multiple CSV files
    const zip = new JSZip();

    // Add each CSV file to the zip
    zip.file('sales.csv', this.createSalesCSV(sales));
    zip.file('deliveries.csv', this.createDeliveriesCSV(deliveries));
    zip.file(
      'bills_and_expenses.csv',
      this.createBillsAndExpensesCSV(billCounts, expenses),
    );
    zip.file('inventory_sheets.csv', this.createInventoryCSV(inventories));
    zip.file('kahon_sheets.csv', this.createKahonCSV(kahons));
    zip.file(
      'shifts_and_employees.csv',
      this.createShiftsCSV(shifts, employees),
    );
    zip.file('orders.csv', this.createOrdersCSV(orders));
    zip.file('transfers.csv', this.createTransfersCSV(transfers));
    zip.file('attachments.csv', this.createAttachmentsCSV(attachments));

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  private createSalesCSV(sales: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'saleId', title: 'Sale ID' },
        { id: 'saleDate', title: 'Sale Date' },
        { id: 'cashier', title: 'Cashier' },
        { id: 'totalAmount', title: 'Total Amount' },
        { id: 'paymentMethod', title: 'Payment Method' },
        { id: 'itemId', title: 'Item ID' },
        { id: 'productName', title: 'Product Name' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'sackType', title: 'Sack Type' },
        { id: 'price', title: 'Price' },
        { id: 'discountedPrice', title: 'Discounted Price' },
        { id: 'isDiscounted', title: 'Is Discounted' },
        { id: 'isSpecialPrice', title: 'Is Special Price' },
        { id: 'isGantang', title: 'Is Gantang' },
      ],
    });

    const records = [];
    sales.forEach((sale) => {
      sale.SaleItem.forEach((item) => {
        records.push({
          saleId: sale.id,
          saleDate: convertToManilaTime(sale.createdAt).toISOString(),
          cashier: sale.cashier.name,
          totalAmount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          itemId: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          sackType: item.sackType || 'Per Kilo',
          price: item.SackPrice?.price || item.perKiloPrice?.price || 0,
          discountedPrice: item.discountedPrice || '',
          isDiscounted: item.isDiscounted,
          isSpecialPrice: item.isSpecialPrice,
          isGantang: item.isGantang,
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createDeliveriesCSV(deliveries: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'deliveryId', title: 'Delivery ID' },
        { id: 'deliveryDate', title: 'Delivery Date' },
        { id: 'driverName', title: 'Driver Name' },
        { id: 'deliveryTimeStart', title: 'Delivery Start Time' },
        { id: 'cashier', title: 'Cashier' },
        { id: 'itemId', title: 'Item ID' },
        { id: 'productName', title: 'Product Name' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'sackType', title: 'Sack Type' },
        { id: 'price', title: 'Price' },
      ],
    });

    const records = [];
    deliveries.forEach((delivery) => {
      delivery.DeliveryItem.forEach((item) => {
        records.push({
          deliveryId: delivery.id,
          deliveryDate: convertToManilaTime(delivery.createdAt).toISOString(),
          driverName: delivery.driverName,
          deliveryTimeStart: convertToManilaTime(
            delivery.deliveryTimeStart,
          ).toISOString(),
          cashier: delivery.cashier.name,
          itemId: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          sackType: item.sackType || 'Per Kilo',
          price: item.SackPrice?.price || item.perKiloPrice?.price || 0,
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createBillsAndExpensesCSV(
    billCounts: any[],
    expenses: any[],
  ): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'type', title: 'Type' },
        { id: 'parentId', title: 'Parent ID' },
        { id: 'itemId', title: 'Item ID' },
        { id: 'date', title: 'Date' },
        { id: 'name', title: 'Name/Description' },
        { id: 'amount', title: 'Amount' },
        { id: 'billType', title: 'Bill Type' },
        { id: 'beginningBalance', title: 'Beginning Balance' },
        { id: 'showBeginningBalance', title: 'Show Beginning Balance' },
      ],
    });

    const records = [];

    // Bill counts and bills
    billCounts.forEach((billCount) => {
      records.push({
        type: 'Bill Count',
        parentId: billCount.id,
        itemId: billCount.id,
        date: convertToManilaTime(billCount.createdAt).toISOString(),
        name: 'Bill Count Session',
        amount: billCount.beginningBalance,
        billType: '',
        beginningBalance: billCount.beginningBalance,
        showBeginningBalance: billCount.showBeginningBalance,
      });

      billCount.Bills.forEach((bill) => {
        records.push({
          type: 'Bill',
          parentId: billCount.id,
          itemId: bill.id,
          date: convertToManilaTime(bill.createdAt).toISOString(),
          name: bill.type,
          amount: bill.amount,
          billType: bill.type,
          beginningBalance: '',
          showBeginningBalance: '',
        });
      });
    });

    // Expenses
    expenses.forEach((expenseList) => {
      records.push({
        type: 'Expense List',
        parentId: expenseList.id,
        itemId: expenseList.id,
        date: convertToManilaTime(expenseList.createdAt).toISOString(),
        name: 'Expense List Session',
        amount: '',
        billType: '',
        beginningBalance: '',
        showBeginningBalance: '',
      });

      expenseList.ExpenseItems.forEach((item) => {
        records.push({
          type: 'Expense Item',
          parentId: expenseList.id,
          itemId: item.id,
          date: convertToManilaTime(item.createdAt).toISOString(),
          name: item.name,
          amount: item.amount,
          billType: '',
          beginningBalance: '',
          showBeginningBalance: '',
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createInventoryCSV(inventories: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'inventoryId', title: 'Inventory ID' },
        { id: 'inventoryName', title: 'Inventory Name' },
        { id: 'cashier', title: 'Cashier' },
        { id: 'sheetId', title: 'Sheet ID' },
        { id: 'sheetName', title: 'Sheet Name' },
        { id: 'columns', title: 'Columns' },
        { id: 'rowId', title: 'Row ID' },
        { id: 'rowIndex', title: 'Row Index' },
        { id: 'isItemRow', title: 'Is Item Row' },
        { id: 'itemId', title: 'Item ID' },
        { id: 'cellId', title: 'Cell ID' },
        { id: 'columnIndex', title: 'Column Index' },
        { id: 'cellValue', title: 'Cell Value' },
        { id: 'formula', title: 'Formula' },
        { id: 'isCalculated', title: 'Is Calculated' },
        { id: 'color', title: 'Color' },
      ],
    });

    const records = [];
    inventories.forEach((inventory) => {
      inventory.InventorySheet.forEach((sheet) => {
        sheet.Rows.forEach((row) => {
          row.Cells.forEach((cell) => {
            records.push({
              inventoryId: inventory.id,
              inventoryName: inventory.name,
              cashier: inventory.cashier.name,
              sheetId: sheet.id,
              sheetName: sheet.name,
              columns: sheet.columns,
              rowId: row.id,
              rowIndex: row.rowIndex,
              isItemRow: row.isItemRow,
              itemId: row.itemId || '',
              cellId: cell.id,
              columnIndex: cell.columnIndex,
              cellValue: cell.value || '',
              formula: cell.formula || '',
              isCalculated: cell.isCalculated,
              color: cell.color || '',
            });
          });
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createKahonCSV(kahons: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'kahonId', title: 'Kahon ID' },
        { id: 'kahonName', title: 'Kahon Name' },
        { id: 'cashier', title: 'Cashier' },
        { id: 'sheetId', title: 'Sheet ID' },
        { id: 'sheetName', title: 'Sheet Name' },
        { id: 'columns', title: 'Columns' },
        { id: 'rowId', title: 'Row ID' },
        { id: 'rowIndex', title: 'Row Index' },
        { id: 'isItemRow', title: 'Is Item Row' },
        { id: 'itemId', title: 'Item ID' },
        { id: 'cellId', title: 'Cell ID' },
        { id: 'columnIndex', title: 'Column Index' },
        { id: 'cellValue', title: 'Cell Value' },
        { id: 'formula', title: 'Formula' },
        { id: 'isCalculated', title: 'Is Calculated' },
        { id: 'color', title: 'Color' },
        { id: 'kahonItemId', title: 'Kahon Item ID' },
        { id: 'kahonItemName', title: 'Kahon Item Name' },
        { id: 'kahonItemQuantity', title: 'Kahon Item Quantity' },
      ],
    });

    const records = [];
    kahons.forEach((kahon) => {
      kahon.Sheets.forEach((sheet) => {
        sheet.Rows.forEach((row) => {
          row.Cells.forEach((cell) => {
            // Find corresponding kahon item if exists
            const kahonItem = kahon.KahonItems.find(
              (item) => item.id === cell.kahonItemId,
            );

            records.push({
              kahonId: kahon.id,
              kahonName: kahon.name,
              cashier: kahon.cashier.name,
              sheetId: sheet.id,
              sheetName: sheet.name,
              columns: sheet.columns,
              rowId: row.id,
              rowIndex: row.rowIndex,
              isItemRow: row.isItemRow,
              itemId: row.itemId || '',
              cellId: cell.id,
              columnIndex: cell.columnIndex,
              cellValue: cell.value || '',
              formula: cell.formula || '',
              isCalculated: cell.isCalculated,
              color: cell.color || '',
              kahonItemId: cell.kahonItemId || '',
              kahonItemName: kahonItem?.name || '',
              kahonItemQuantity: kahonItem?.quantity || '',
            });
          });
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createShiftsCSV(shifts: any[], employees: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'shiftId', title: 'Shift ID' },
        { id: 'startTime', title: 'Start Time' },
        { id: 'endTime', title: 'End Time' },
        { id: 'cashier', title: 'Cashier' },
        { id: 'employeeId', title: 'Employee ID' },
        { id: 'employeeName', title: 'Employee Name' },
        { id: 'shiftEmployeeId', title: 'Shift Employee ID' },
      ],
    });

    const records = [];
    shifts.forEach((shift) => {
      shift.employee.forEach((shiftEmployee) => {
        records.push({
          shiftId: shift.id,
          startTime: convertToManilaTime(shift.startTime).toISOString(),
          endTime: shift.endTime
            ? convertToManilaTime(shift.endTime).toISOString()
            : 'Ongoing',
          cashier: shift.cashier.name,
          employeeId: shiftEmployee.employee.id,
          employeeName: shiftEmployee.employee.name,
          shiftEmployeeId: shiftEmployee.id,
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createOrdersCSV(orders: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'orderId', title: 'Order ID' },
        { id: 'orderDate', title: 'Order Date' },
        { id: 'customerName', title: 'Customer Name' },
        { id: 'customerEmail', title: 'Customer Email' },
        { id: 'customerAddress', title: 'Customer Address' },
        { id: 'customerPhone', title: 'Customer Phone' },
        { id: 'totalPrice', title: 'Total Price' },
        { id: 'status', title: 'Status' },
        { id: 'itemId', title: 'Item ID' },
        { id: 'productName', title: 'Product Name' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'sackType', title: 'Sack Type' },
        { id: 'price', title: 'Price' },
        { id: 'isSpecialPrice', title: 'Is Special Price' },
      ],
    });

    const records = [];
    orders.forEach((order) => {
      order.OrderItem.forEach((item) => {
        records.push({
          orderId: order.id,
          orderDate: convertToManilaTime(order.createdAt).toISOString(),
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerAddress: order.customer.address,
          customerPhone: order.customer.phone,
          totalPrice: order.totalPrice,
          status: order.status,
          itemId: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          sackType: item.sackType || 'Per Kilo',
          price: item.SackPrice?.price || item.perKiloPrice?.price || 0,
          isSpecialPrice: item.isSpecialPrice,
        });
      });
    });

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createTransfersCSV(transfers: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'transferId', title: 'Transfer ID' },
        { id: 'transferDate', title: 'Transfer Date' },
        { id: 'name', title: 'Name' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'type', title: 'Transfer Type' },
        { id: 'cashier', title: 'Cashier' },
      ],
    });

    const records = transfers.map((transfer) => ({
      transferId: transfer.id,
      transferDate: convertToManilaTime(transfer.createdAt).toISOString(),
      name: transfer.name,
      quantity: transfer.quantity,
      type: transfer.type,
      cashier: transfer.cashier.name,
    }));

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  private createAttachmentsCSV(attachments: any[]): string {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'attachmentId', title: 'Attachment ID' },
        { id: 'name', title: 'Name' },
        { id: 'url', title: 'URL' },
        { id: 'type', title: 'Type' },
        { id: 'uploadDate', title: 'Upload Date' },
      ],
    });

    const records = attachments.map((attachment) => ({
      attachmentId: attachment.id,
      name: attachment.name,
      url: attachment.url,
      type: attachment.type,
      uploadDate: convertToManilaTime(attachment.createdAt).toISOString(),
    }));

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }
}
