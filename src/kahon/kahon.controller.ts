import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { KahonService } from './kahon.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('kahon')
export class KahonController {
  constructor(private kahonService: KahonService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getKahonByCashier(@Request() req) {
    const cashierId = req.user.id; // Use cashier's ID from JWT
    // Add date query parameters if needed by getKahonByCashier
    const { startDate: startDateStr, endDate: endDateStr } = req.query;
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;
    return this.kahonService.getKahonByCashier(cashierId, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user') // Changed route from 'cashier/:id' to 'user' for clarity
  async getKahonsByUser(@Request() req) {
    // Changed method signature
    const userId = req.user.id; // User's ID from JWT
    const { startDate: startDateStr, endDate: endDateStr } = req.query;
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;
    return this.kahonService.getKahonsByUserId(userId, startDate, endDate);
  }
}
