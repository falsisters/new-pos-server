import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CashierInvalidCredentialsException } from './cashier.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterCashierDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { EditCashierDto } from './dto/edit.dto';

@Injectable()
export class CashierService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async findExistingCashier(name: string) {
    return this.prisma.cashier.findUnique({
      where: {
        name,
      },
    });
  }

  async validateCashier(name: string, accessKey: string) {
    const cashier = await this.findExistingCashier(name);

    if (!cashier) {
      throw new CashierInvalidCredentialsException();
    }

    if (cashier.accessKey !== accessKey) {
      throw new CashierInvalidCredentialsException();
    }

    return cashier;
  }

  async login(cashier: any) {
    const payload = {
      id: cashier.id,
      userId: cashier.userId,
      name: cashier.name,
      secureCode: cashier.secureCode,
      permissions: cashier.permissions,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '3d',
      }),
    };
  }

  async register(userId: string, registerCashierDto: RegisterCashierDto) {
    const { name, accessKey, permissions } = registerCashierDto;

    return this.prisma.$transaction(async (tx) => {
      const cashier = await tx.cashier.create({
        data: {
          name,
          accessKey,
          permissions,
          userId,
        },
      });

      // Create default Kahon for the cashier
      await tx.kahon.create({
        data: {
          cashierId: cashier.id,
          name: 'Kahon',
          Sheets: {
            create: {
              name: 'Kahon Sheet',
              columns: 15, // Or your default
            },
          },
        },
      });

      // Create default Inventory for products for the cashier
      await tx.inventory.create({
        data: {
          cashierId: cashier.id,
          name: 'Inventory',
          InventorySheet: {
            create: {
              name: 'Inventory Sheet',
              columns: 15, // Or your default
            },
          },
        },
      });

      // Create default Inventory for expenses for the cashier
      await tx.inventory.create({
        data: {
          cashierId: cashier.id,
          name: 'Expenses',
          InventorySheet: {
            create: {
              name: 'Expenses Sheet',
              columns: 15, // Or your default
            },
          },
        },
      });
      return cashier;
    });
  }

  async getCashier(id: string) {
    return this.prisma.cashier.findUnique({
      where: {
        id,
      },
    });
  }

  async getAllCashiers(userId: string) {
    return this.prisma.cashier.findMany({
      where: {
        userId,
      },
    });
  }

  async editCashier(id: string, editCashierDto: EditCashierDto) {
    const { name, accessKey, permissions } = editCashierDto;

    return this.prisma.cashier.update({
      where: {
        id,
      },
      data: {
        name,
        accessKey,
        permissions,
      },
    });
  }
  async deleteCashier(id: string) {
    return this.prisma.cashier.delete({
      where: { id },
    });
  }
}
