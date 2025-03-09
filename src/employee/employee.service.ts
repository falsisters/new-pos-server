import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create.dto';
import { EditEmployeeDto } from './dto/edit.dto';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async createEmployee(userId: string, createEmployeeDto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        ...createEmployeeDto,
        userId,
      },
    });
  }

  async editEmployee(id: string, editEmployeeDto: EditEmployeeDto) {
    return this.prisma.employee.update({
      where: {
        id,
      },
      data: editEmployeeDto,
    });
  }

  async deleteEmployee(id: string) {
    return this.prisma.employee.delete({
      where: {
        id,
      },
    });
  }

  async getAllEmployees(userId: string) {
    return this.prisma.employee.findMany({
      where: {
        userId,
      },
      include: {
        ShiftEmployee: {
          include: {
            shift: true,
          },
        },
      },
    });
  }

  async getEmployeeById(id: string) {
    return this.prisma.employee.findUnique({
      where: {
        id,
      },
      include: {
        ShiftEmployee: {
          include: {
            shift: true,
          },
        },
      },
    });
  }
}
