import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShiftDto } from './dto/create.dto';
import { EditShiftDto } from './dto/edit.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

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

    return {
      ...newShift,
      employees: newShift.employee.map((e) => e.employee),
      employee: undefined,
    };
  }

  async endShift(id: string) {
    return this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        endTime: new Date(),
      },
    });
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

    // Transform the data to flatten the employee structure
    return shifts.map((shift) => ({
      ...shift,
      employees: shift.employee.map((e) => e.employee),
      employee: undefined, // Remove the nested structure
    }));
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
    const { employees } = editShiftDto;
    return this.prisma.shift.update({
      where: {
        id,
      },
      data: {
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
