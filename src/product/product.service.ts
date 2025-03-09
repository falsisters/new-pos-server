import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create.dto';
import { UploadService } from 'src/upload/upload.service';
import { EditProductDto } from './dto/edit.dto';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async createProduct(userId: string, createProductDto: CreateProductDto) {
    const { picture, name, sackPrice, perKiloPrice } = createProductDto;

    const url = await this.uploadService.uploadSingleFile(picture, 'products/');

    return this.prisma.product.create({
      data: {
        name,
        picture: url,
        userId,
        SackPrice: {
          create: sackPrice.map((price) => ({
            price: price.price,
            type: price.type,
            stock: price.stock,
            specialPrice: {
              create: {
                price: price.specialPrice.price,
                minimumQty: price.specialPrice.minimumQty,
              },
            },
          })),
        },
        perKiloPrice: {
          create: perKiloPrice,
        },
      },
      include: {
        perKiloPrice: true,
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
      },
    });
  }

  async editProduct(id: string, editProductDto: EditProductDto) {
    const { picture, name, sackPrice, perKiloPrice } = editProductDto;

    const url = picture
      ? await this.uploadService.uploadSingleFile(picture, 'products/')
      : null;

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        name,
        picture: url,
        SackPrice: {
          update: sackPrice.map((price) => ({
            where: {
              id: price.id,
            },
            data: {
              price: price.price,
              type: price.type,
              stock: price.stock,
              specialPrice: {
                update: {
                  where: {
                    id: price.specialPrice.id,
                  },
                  data: {
                    price: price.specialPrice.price,
                    minimumQty: price.specialPrice.minimumQty,
                  },
                },
              },
            },
          })),
        },
        perKiloPrice: {
          update: perKiloPrice,
        },
      },
      include: {
        perKiloPrice: true,
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
      },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({
      where: {
        id,
      },
    });
  }

  async getAllProducts(userId: string) {
    return this.prisma.product.findMany({
      where: {
        userId,
      },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        perKiloPrice: true,
      },
    });
  }

  async getProductById(id: string) {
    return this.prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        perKiloPrice: true,
      },
    });
  }
}
