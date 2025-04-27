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
    const userId = req.user.userId;
    return this.kahonService.getKahonByCashier(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:id')
  async getKahonByUser(@Param('id') id) {
    return this.kahonService.getKahonByCashier(id);
  }
}
