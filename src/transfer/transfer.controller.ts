import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { TransferProductDto } from './dto/transferProduct.dto';
import { TransferService } from './transfer.service';
import { TransferDeliveryDto } from './dto/transferDelivery.dto';

@Controller('transfer')
export class TransferController {
  constructor(private transferService: TransferService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Post('product')
  async transferProduct(
    @Request() req,
    @Body() transferProductDto: TransferProductDto,
  ) {
    const cashierId = req.user.id;
    console.log('transferProductDto', transferProductDto);
    return this.transferService.transferProduct(cashierId, transferProductDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('delivery')
  async transferDelivery(
    @Request() req,
    @Body() transferDeliveryDto: TransferDeliveryDto,
  ) {
    const cashierId = req.user.id;
    return this.transferService.transferDelivery(
      cashierId,
      transferDeliveryDto,
    );
  }
}
