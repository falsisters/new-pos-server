import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CreateExpenseDto } from './dto/createExpense.dto';
import { GetExpenseByDateDto } from './dto/getExpenseByDate.dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  // Cashier routes (protected with JwtCashierAuthGuard)
  @UseGuards(JwtCashierAuthGuard)
  @Post('create')
  async createExpense(
    @Request() req,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    const cashierId = req.user.id; // This is the cashier ID from JwtCashierAuthGuard
    return await this.expensesService.createExpense(
      cashierId,
      createExpenseDto,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Put('update/:id')
  async updateExpense(
    @Request() req,
    @Param('id') expenseListId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return await this.expensesService.editExpense(
      expenseListId,
      createExpenseDto,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('today')
  async getExpenseByDate(@Request() req, @Query('date') date?: string) {
    const cashierId = req.user.id; // This is the cashier ID from JwtCashierAuthGuard
    return await this.expensesService.getFirstExpenseByDay(cashierId, { date });
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete(':id')
  async deleteExpense(@Request() req, @Param('id') expenseId: string) {
    return await this.expensesService.deleteExpense(expenseId);
  }

  // User oversight routes (protected with JwtAuthGuard)
  @UseGuards(JwtAuthGuard)
  @Post('user/create')
  async userCreateExpense(
    @Request() req,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    const userId = req.user.id;
    return await this.expensesService.createUserExpense(
      userId,
      createExpenseDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('user/update/:id')
  async userUpdateExpense(
    @Param('id') expenseListId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return await this.expensesService.editExpense(
      expenseListId,
      createExpenseDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/today')
  async userGetExpenseByDate(@Request() req, @Query('date') date?: string) {
    const userId = req.user.id;
    return await this.expensesService.getUserExpenseByDate(userId, { date });
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/all')
  async getAllUserExpensesByDate(@Query('date') date?: string) {
    return await this.expensesService.getAllUserExpensesByDate(date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/all')
  async getAllCashierExpensesByDate(@Query('date') date?: string) {
    return await this.expensesService.getAllCashierExpensesByDate(date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:id')
  async userGetExpenseById(@Param('id') expenseListId: string) {
    return await this.expensesService.getExpenseById(expenseListId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/:id')
  async userDeleteExpense(@Param('id') expenseListId: string) {
    return await this.expensesService.deleteExpense(expenseListId);
  }
}
