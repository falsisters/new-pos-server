import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { TransferProductDto } from './dto/transferProduct.dto';
import { TransferService } from './transfer.service';
import { TransferDeliveryDto } from './dto/transferDelivery.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { EditTransferDto } from './dto/editTransfer.dto';
import { TransferFilterDto } from './dto/transferWithFilter.dto';

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
    // Remove userId since products are now under cashier
    return this.transferService.transferProduct(cashierId, transferProductDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('delivery')
  async transferDelivery(
    @Request() req,
    @Body() transferDeliveryDto: TransferDeliveryDto,
  ) {
    const cashierId = req.user.id; // Use cashier's ID from JWT
    return this.transferService.transferDelivery(
      cashierId,
      transferDeliveryDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllTransfersByUser(@Request() req) {
    const userId = req.user.id;
    // This fetches transfers linked to cashiers under the user.
    // The existing service logic for getAllTransfers should work if cashierIds are derived correctly.
    return this.transferService.getAllTransfers(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllTransfersByCashier(@Request() req) {
    const cashierId = req.user.id;
    // Get transfers for this specific cashier only
    return this.transferService.getAllTransfersByCashier(cashierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:cashierId')
  async getAllTransfersByCashierId(
    @Request() req,
    @Param('cashierId') cashierId: string,
  ) {
    const userId = req.user.id;
    // Verify cashier belongs to this user
    await this.transferService.verifyCashierOwnership(userId, cashierId);
    return this.transferService.getAllTransfersByCashier(cashierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:cashierId/date')
  async getAllTransfersByCashierWithDate(
    @Request() req,
    @Param('cashierId') cashierId: string,
    @Query() filters: TransferFilterDto,
  ) {
    const userId = req.user.id;
    // Verify cashier belongs to this user
    await this.transferService.verifyCashierOwnership(userId, cashierId);
    return this.transferService.getAllTransfersWithFilterByCashier(
      cashierId,
      filters,
    );
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
