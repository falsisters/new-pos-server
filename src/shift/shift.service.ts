import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShiftDto } from './dto/create.dto';
import { EditShiftDto } from './dto/edit.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async createShift(cashierId: string, createShiftDto: CreateShiftDto) {
    const { employees } = createShiftDto;
    return this.prisma.shift.create({
      data: {
        cashier: {
          connect: {
            id: cashierId,
          },
        },
        startTime: new Date(),
        employee: {
          create: employees.map((employee) => ({
            employeeId: employee.id,
          })),
        },
      },
      include: {
        employee: {
          include: {
            employee: true,
          },
        },
      },
    });
  }

  async getAllShiftsByCashierId(cashierId: string) {
    return this.prisma.shift.findMany({
      where: {
        cashierId,
      },
      include: {
        employee: {
          include: {
            employee: true,
          },
        },
      },
    });
  }

  async getShiftById(id: string) {
    return this.prisma.shift.findUnique({
      where: {
        id,
      },
      include: {
        employee: {
          include: {
            employee: true,
          },
        },
      },
    });
  }

  async deleteShift(id: string) {
    return this.prisma.shift.delete({
      where: {
        id,
      },
    });
  }

  async editShift(id: string, editShiftDto: EditShiftDto) {
    const { cashierId, employees } = editShiftDto;
    return this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        cashier: {
          connect: {
            id: cashierId,
          },
        },
        employee: {
          deleteMany: {},
          create: employees.map((employee) => ({
            employeeId: employee.id,
          })),
        },
      },
      include: {
        employee: {
          include: {
            employee: true,
          },
        },
      },
    });
  }
}
