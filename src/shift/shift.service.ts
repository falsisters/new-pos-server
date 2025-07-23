import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShiftDto } from './dto/create.dto';
import { EditShiftDto } from './dto/edit.dto';
import {
  convertObjectDatesToManilaTime,
  parseManilaDateForStorage,
} from '../utils/date.util';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  private formatShift(shift: any) {
    if (!shift) return null;
    const formatted = {
      ...shift,
      employees: shift.employee
        ? shift.employee.map((e) => convertObjectDatesToManilaTime(e.employee))
        : shift.employees,
      employee: undefined,
    };
    return convertObjectDatesToManilaTime(formatted);
  }

  async createShift(cashierId: string, createShiftDto: CreateShiftDto) {
    const { employees } = createShiftDto;
    console.log(createShiftDto);

    // Store shift creation time in UTC
    const currentTimeUTC = parseManilaDateForStorage();

    const newShift = await this.prisma.shift.create({
      data: {
        createdAt: currentTimeUTC,
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
    // Store end time in UTC
    const endTimeUTC = parseManilaDateForStorage();

    const result = await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        endTime: endTimeUTC,
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
