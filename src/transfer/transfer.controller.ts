import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { TransferProductDto } from './dto/transferProduct.dto';
import { TransferService } from './transfer.service';
import { TransferDeliveryDto } from './dto/transferDelivery.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { EditTransferDto } from './dto/editTransfer.dto';

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

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllTransfersByUser(@Request() req) {
    const userId = req.user.id;
    return this.transferService.getAllTransfers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteTransfer(@Param('id') id: string) {
    return this.transferService.deleteTransfer(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getTransfer(@Param('id') id: string) {
    return this.transferService.getTransfer(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async editTransfer(
    @Param('id') id: string,
    @Body() editTransferDto: EditTransferDto,
  ) {
    return this.transferService.editTransfer(id, editTransferDto);
  }
}
