import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { TransferProductDto } from './dto/transferProduct.dto';
import { TransferService } from './transfer.service';

@Controller('transfer')
export class TransferController {
  constructor(private transferService: TransferService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Post('product')
  async transferProduct(
    cashierId: string,
    transferProductDto: TransferProductDto,
  ) {
    return this.transferService.transferProduct(cashierId, transferProductDto);
  }
}
