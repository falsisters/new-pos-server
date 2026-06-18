import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CashierInvalidCredentialsException } from './cashier.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterCashierDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { EditCashierDto } from './dto/edit.dto';
import { formatDateForClient } from 'src/utils/date.util';

@Injectable()
export class CashierService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private formatCashier(cashier: any) {
    if (!cashier) return null;
    return {
      ...cashier,
      createdAt: formatDateForClient(cashier.createdAt),
      updatedAt: formatDateForClient(cashier.updatedAt),
    };
  }

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

    const isPasswordValid = await bcrypt.compare(accessKey, cashier.accessKey);

    if (!isPasswordValid) {
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

    const hashedAccessKey = await bcrypt.hash(accessKey, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const cashier = await tx.cashier.create({
        data: {
          name,
          accessKey: hashedAccessKey,
          permissions,
          userId,
          passwordVersion: 'bcrypt:v1',
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
    return this.formatCashier(result);
  }

  async getCashier(id: string) {
    const cashier = await this.prisma.cashier.findUnique({
      where: {
        id,
      },
    });
    return this.formatCashier(cashier);
  }

  async getAllCashiers(userId: string) {
    const cashiers = await this.prisma.cashier.findMany({
      where: {
        userId,
      },
    });
    return cashiers.map((c) => this.formatCashier(c));
  }

  async editCashier(id: string, editCashierDto: EditCashierDto) {
    const { name, accessKey, permissions } = editCashierDto;

    const updateData: Record<string, unknown> = { name, permissions };

    if (accessKey) {
      updateData.accessKey = await bcrypt.hash(accessKey, 10);
      updateData.passwordVersion = 'bcrypt:v1';
    }

    const cashier = await this.prisma.cashier.update({
      where: { id },
      data: updateData,
    });
    return this.formatCashier(cashier);
  }

  async deleteCashier(id: string) {
    const cashier = await this.prisma.cashier.delete({
      where: { id },
    });
    return this.formatCashier(cashier);
  }

  async onModuleInit() {
    const plaintextCashiers = await this.prisma.cashier.findMany({
      where: { passwordVersion: null },
    });

    for (const cashier of plaintextCashiers) {
      try {
        const hashed = await bcrypt.hash(cashier.accessKey, 10);
        await this.prisma.cashier.update({
          where: { id: cashier.id },
          data: { accessKey: hashed, passwordVersion: 'bcrypt:v1' },
        });
      } catch (error) {
        console.error(
          `Failed to migrate cashier ${cashier.id}: ${error.message}`,
        );
      }
    }

    if (plaintextCashiers.length > 0) {
      console.log(
        `Migrated ${plaintextCashiers.length} cashier(s) to bcrypt hashing`,
      );
    }
  }
}
