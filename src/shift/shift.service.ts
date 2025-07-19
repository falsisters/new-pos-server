import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShiftDto } from './dto/create.dto';
import { EditShiftDto } from './dto/edit.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  // Helper function to convert UTC to Philippine time (UTC+8)
  private convertToPhilippineTime(utcDate: Date): Date {
    if (!utcDate) return null;
    const philippineTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    return philippineTime;
  }

  private formatShift(shift: any) {
    if (!shift) return null;
    return {
      ...shift,
      createdAt: this.convertToPhilippineTime(shift.createdAt),
      updatedAt: this.convertToPhilippineTime(shift.updatedAt),
      startTime: this.convertToPhilippineTime(shift.startTime),
      endTime: this.convertToPhilippineTime(shift.endTime),
      employees: shift.employee
        ? shift.employee.map((e) => ({
            ...e.employee,
            createdAt: this.convertToPhilippineTime(e.employee.createdAt),
            updatedAt: this.convertToPhilippineTime(e.employee.updatedAt),
          }))
        : shift.employees,
      employee: undefined,
    };
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
