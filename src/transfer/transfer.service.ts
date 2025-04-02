import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransferDeliveryDto } from './dto/transferDelivery.dto';
import { Kahon, KahonItem, SackType, Transfer } from '@prisma/client';
import { TransferProductDto } from './dto/transferProduct.dto';
import { EditTransferDto } from './dto/editTransfer.dto';

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService) {}

  private parseSackType(type: SackType) {
    switch (type) {
      case 'FIFTY_KG':
        return '50KG';
      case 'TWENTY_FIVE_KG':
        return '25KG';
      case 'FIVE_KG':
        return '5KG';
    }
  }

  async getAllTransfers(userId: string) {
    const cashiers = await this.prisma.cashier.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    const cashierIds = cashiers.map((cashier) => cashier.id);

    return this.prisma.transfer.findMany({
      where: {
        cashierId: {
          in: cashierIds,
        },
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async deleteTransfer(id: string) {
    return this.prisma.transfer.delete({
      where: { id },
    });
  }

  async editTransfer(id: string, editTransferDto: EditTransferDto) {
    const { quantity, name, type } = editTransferDto;
    return this.prisma.transfer.update({
      where: { id },
      data: {
        quantity,
        name,
        type,
      },
    });
  }

  async getTransfer(id: string) {
    return this.prisma.transfer.findUnique({
      where: { id },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async transferDelivery(
    cashierId: string,
    transferDeliveryDto: TransferDeliveryDto,
  ) {
    const { name, quantity } = transferDeliveryDto;
    let selectedKahon: Kahon;
    const currentKahon = await this.prisma.kahon.findUnique({
      where: { cashierId: cashierId },
    });

    if (!currentKahon) {
      selectedKahon = await this.prisma.kahon.create({
        data: {
          name: 'Kahon',
          cashierId,
        },
      });
    } else {
      selectedKahon = currentKahon;
    }

    return this.prisma.kahonItem.create({
      data: {
        name: `${name} ${quantity}KG`,
        quantity: 0,
        kahon: { connect: { id: selectedKahon.id } },
      },
    });
  }

  async transferProduct(
    cashierId: string,
    transferProductDto: TransferProductDto,
  ) {
    const { product } = transferProductDto;

    if (transferProductDto.transferType === 'KAHON') {
      let selectedKahon: Kahon;
      const currentKahon = await this.prisma.kahon.findUnique({
        where: { cashierId: cashierId },
      });

      if (!currentKahon) {
        selectedKahon = await this.prisma.kahon.create({
          data: {
            name: 'Kahon',
            cashierId,
          },
        });
      } else {
        selectedKahon = currentKahon;
      }

      return this.prisma.$transaction(async (tx) => {
        if (product.sackPrice) {
          await tx.sackPrice.update({
            where: { id: product.sackPrice.id },
            data: {
              stock: { decrement: product.sackPrice.quantity },
            },
          });
        }

        if (product.perKiloPrice) {
          await tx.perKiloPrice.update({
            where: { id: product.perKiloPrice.id },
            data: {
              stock: { decrement: product.perKiloPrice.quantity },
            },
          });
        }

        let kahonItem: KahonItem;

        const currentProduct = await tx.product.findUnique({
          where: {
            id: product.id,
          },
        });

        if (currentProduct) {
          if (product.sackPrice) {
            kahonItem = await tx.kahonItem.create({
              data: {
                kahonId: selectedKahon.id,
                quantity: product.sackPrice.quantity,
                name: `${currentProduct.name} ${this.parseSackType(product.sackPrice.type)}`,
              },
            });
          }

          if (product.perKiloPrice) {
            kahonItem = await tx.kahonItem.create({
              data: {
                kahonId: selectedKahon.id,
                quantity: 0,
                name: `${currentProduct.name} ${product.perKiloPrice.quantity}KG`,
              },
            });
          }
        }

        return kahonItem;
      });
    } else {
      return this.prisma.$transaction(async (tx) => {
        if (product.sackPrice) {
          await tx.sackPrice.update({
            where: { id: product.sackPrice.id },
            data: {
              stock: { decrement: product.sackPrice.quantity },
            },
          });
        }

        if (product.perKiloPrice) {
          await tx.perKiloPrice.update({
            where: { id: product.perKiloPrice.id },
            data: {
              stock: { decrement: product.perKiloPrice.quantity },
            },
          });
        }

        let transfer: Transfer;

        const currentProduct = await tx.product.findUnique({
          where: {
            id: product.id,
          },
        });

        if (currentProduct && product.sackPrice) {
          transfer = await tx.transfer.create({
            data: {
              name: `${currentProduct.name} ${this.parseSackType(product.sackPrice.type)}`,
              quantity: product.sackPrice.quantity,
              type: transferProductDto.transferType,
              cashier: { connect: { id: cashierId } },
            },
          });
        }

        if (currentProduct && product.perKiloPrice) {
          transfer = await tx.transfer.create({
            data: {
              name: `${currentProduct.name} ${product.perKiloPrice.quantity}KG`,
              quantity: 0,
              type: transferProductDto.transferType,
              cashier: { connect: { id: cashierId } },
            },
          });
        }

        return transfer;
      });
    }
  }
}
