import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getInventoryByCashier(@Request() req) {
    const cashierId = req.user.id;
    return this.inventoryService.getInventorySheetWithData(cashierId);
  }

  // Get startDate and endDate in Search Params
  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier/data')
  async getInventoryDataByCashier(@Request() req) {
    const cashierId = req.user.id;
    const { startDate, endDate } = req.query;

    const inventory =
      await this.inventoryService.findInventoryByCashier(cashierId);

    return this.inventoryService.getInventorySheetsByDateRange(
      inventory.id,
      startDate,
      endDate,
    );
  }
}
