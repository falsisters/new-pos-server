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
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { EditEmployeeDto } from './dto/edit.dto';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';

@Controller('employee')
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createEmployee(
    @Request() req,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    const userId = req.user.id;
    return this.employeeService.createEmployee(userId, createEmployeeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() editEmployeeDto: EditEmployeeDto,
  ) {
    return this.employeeService.editEmployee(id, editEmployeeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    return this.employeeService.deleteEmployee(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllEmployeesByUser(@Request() req) {
    const userId = req.user.id;
    return this.employeeService.getAllEmployees(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllEmployeesByCashier(@Request() req) {
    const userId = req.user.userId;
    return this.employeeService.getAllEmployees(userId);
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string) {
    return this.employeeService.getEmployeeById(id);
  }
}
