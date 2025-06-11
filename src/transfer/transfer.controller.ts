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
    const userId = req.user.userId;
    console.log('transferProductDto', transferProductDto);
    return this.transferService.transferProduct(
      userId,
      cashierId,
      transferProductDto,
    );
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
    // This implies getting transfers for the specific logged-in cashier.
    // The current getAllTransfers(userId) gets all transfers for all cashiers of a user.
    // This might need a new service method or modification if it's strictly for the single logged-in cashier.
    // For now, assuming it means all transfers visible to this cashier (i.e., all under their owner user).
    const userId = req.user.userId; // Owner user ID
    return this.transferService.getAllTransfers(userId);
    // If it should be only for the specific cashier:
    // const cashierId = req.user.id;
    // return this.prisma.transfer.findMany({ where: { cashierId } ... }); // Simplified example
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier/date')
  async getAllTransfersByCashierWithDate(
    @Request() req,
    @Query() filters: TransferFilterDto,
  ) {
    const userId = req.user.userId; // Owner user ID
    // Similar to above, this filters for all cashiers under the user.
    return this.transferService.getAllTransfersWithFilter(userId, filters);
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
