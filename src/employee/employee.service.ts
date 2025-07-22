import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create.dto';
import { EditEmployeeDto } from './dto/edit.dto';
import { EmployeeAttendanceFilterDto } from './dto/employee-attendance.dto';
import { convertToManilaTime, parseManilaDateRange } from 'src/utils/date.util';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  private formatEmployee(employee: any) {
    if (!employee) return null;
    return {
      ...employee,
      createdAt: convertToManilaTime(employee.createdAt),
      updatedAt: convertToManilaTime(employee.updatedAt),
      ShiftEmployee: employee.ShiftEmployee
        ? employee.ShiftEmployee.map((se) => ({
            ...se,
            createdAt: convertToManilaTime(se.createdAt),
            updatedAt: convertToManilaTime(se.updatedAt),
            shift: se.shift
              ? {
                  ...se.shift,
                  startTime: convertToManilaTime(se.shift.startTime),
                  endTime: convertToManilaTime(se.shift.endTime),
                  createdAt: convertToManilaTime(se.shift.createdAt),
                  updatedAt: convertToManilaTime(se.shift.updatedAt),
                }
              : null,
          }))
        : [],
    };
  }

  async createEmployee(userId: string, createEmployeeDto: CreateEmployeeDto) {
    const employee = await this.prisma.employee.create({
      data: {
        ...createEmployeeDto,
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
    return this.formatEmployee(employee);
  }

  async editEmployee(id: string, editEmployeeDto: EditEmployeeDto) {
    const employee = await this.prisma.employee.update({
      where: {
        id,
      },
      data: editEmployeeDto,
      include: {
        ShiftEmployee: {
          include: {
            shift: true,
          },
        },
      },
    });
    return this.formatEmployee(employee);
  }

  async deleteEmployee(id: string) {
    const employee = await this.prisma.employee.delete({
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
    return this.formatEmployee(employee);
  }

  async getAllEmployees(userId: string) {
    const employees = await this.prisma.employee.findMany({
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
    return employees.map((e) => this.formatEmployee(e));
  }

  async getEmployeeById(id: string) {
    const employee = await this.prisma.employee.findUnique({
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
    return this.formatEmployee(employee);
  }

  async getEmployeeAttendance(
    userId: string,
    filters: EmployeeAttendanceFilterDto,
  ) {
    // Parse Manila Time date parameters properly
    const { startDate, endDate } = parseManilaDateRange(
      filters.startDate,
      filters.endDate,
    );

    // Set default date range if no dates provided - end date is today, start date is 30 days ago
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all shifts within the date range for this user
    const shifts = await this.prisma.shift.findMany({
      where: {
        cashier: {
          userId,
        },
        startTime: {
          gte: start,
          lte: end,
        },
      },
      include: {
        employee: {
          include: {
            employee: true,
          },
        },
        cashier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Format the attendance data
    const attendanceData = shifts.map((shift) => {
      const manilaStartTime = convertToManilaTime(shift.startTime);
      const manilaEndTime = convertToManilaTime(shift.endTime);

      const shiftDate = manilaStartTime.toISOString().split('T')[0];
      const shiftStartTime = manilaStartTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const shiftEndTime = manilaEndTime
        ? manilaEndTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : 'Ongoing';

      return {
        id: shift.id,
        date: shiftDate,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        isOngoing: !shift.endTime,
        cashierName: shift.cashier.name,
        employees: shift.employee.map((shiftEmployee) => ({
          id: shiftEmployee.employee.id,
          name: shiftEmployee.employee.name,
          joinedAt: convertToManilaTime(shiftEmployee.createdAt),
          createdAt: convertToManilaTime(shiftEmployee.createdAt),
          updatedAt: convertToManilaTime(shiftEmployee.updatedAt),
        })),
        totalEmployees: shift.employee.length,
        createdAt: convertToManilaTime(shift.createdAt),
        updatedAt: convertToManilaTime(shift.updatedAt),
      };
    });

    // Get summary statistics
    const totalShifts = shifts.length;
    const ongoingShifts = shifts.filter((shift) => !shift.endTime).length;
    const completedShifts = totalShifts - ongoingShifts;

    // Get unique employees who worked in this period
    const uniqueEmployees = new Set();
    shifts.forEach((shift) => {
      shift.employee.forEach((shiftEmployee) => {
        uniqueEmployees.add(shiftEmployee.employee.id);
      });
    });

    // Group attendance by date for better visualization
    const attendanceByDate = attendanceData.reduce((acc, shift) => {
      if (!acc[shift.date]) {
        acc[shift.date] = [];
      }
      acc[shift.date].push(shift);
      return acc;
    }, {});

    return {
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        totalDays:
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1,
      },
      summary: {
        totalShifts,
        completedShifts,
        ongoingShifts,
        uniqueEmployeesCount: uniqueEmployees.size,
        daysWithShifts: Object.keys(attendanceByDate).length,
      },
      attendance: attendanceData,
      attendanceByDate,
    };
  }
}
