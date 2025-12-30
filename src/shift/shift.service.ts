import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShiftDto } from './dto/create.dto';
import { EditShiftDto } from './dto/edit.dto';
import { formatDateForClient } from '../utils/date.util';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  private formatShift(shift: any) {
    if (!shift) return null;
    const formatted = {
      ...shift,
      createdAt: formatDateForClient(shift.createdAt),
      updatedAt: formatDateForClient(shift.updatedAt),
      endTime: shift.endTime ? formatDateForClient(shift.endTime) : null,
      employees: shift.employee
        ? shift.employee.map((e) => ({
            ...e.employee,
            createdAt: formatDateForClient(e.employee.createdAt),
            updatedAt: formatDateForClient(e.employee.updatedAt),
          }))
        : shift.employees,
      employee: undefined,
    };
    return formatted;
  }

  async createShift(cashierId: string, createShiftDto: CreateShiftDto) {
    const { employees } = createShiftDto;
    console.log(createShiftDto);

    const newShift = await this.prisma.shift.create({
      data: {
        cashier: {
          connect: {
            id: cashierId,
          },
        },
        employee: {
          create: employees.map((employee) => ({
            employeeId: employee,
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

    return this.formatShift(newShift);
  }

  async endShift(id: string) {
    const result = await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        endTime: new Date(),
      },
    });
    return this.formatShift(result);
  }

  async getAllShiftsByCashierId(cashierId: string) {
    const shifts = await this.prisma.shift.findMany({
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

    return shifts.map((shift) => this.formatShift(shift));
  }

  async getShiftById(id: string) {
    const result = await this.prisma.shift.findUnique({
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
    return this.formatShift(result);
  }

  async deleteShift(id: string) {
    const result = await this.prisma.shift.delete({
      where: {
        id,
      },
    });
    return this.formatShift(result);
  }

  async editShift(id: string, editShiftDto: EditShiftDto) {
    const { employees } = editShiftDto;
    const updatedShift = await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        employee: {
          deleteMany: {},
          create: employees.map((employee) => ({
            employeeId: employee,
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

    return this.formatShift(updatedShift);
  }
}
