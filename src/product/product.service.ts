import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { ProductFormData } from './types/productFormData.type';
import { EditProductFormData } from './types/editProductFormData.type';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async createProduct(userId: string, formData: ProductFormData) {
    // Extract file from form data
    const picture = formData.picture;

    // Parse JSON strings from form data
    const name = formData.name;
    const sackPrice = JSON.parse(formData.sackPrice);
    const perKiloPrice = formData.perKiloPrice
      ? JSON.parse(formData.perKiloPrice)
      : null;

    // Upload the picture if provided
    const url = picture
      ? await this.uploadService.uploadSingleFile(picture, 'products/')
      : null;

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
            profit: price.profit,
            specialPrice: price.specialPrice
              ? {
                  create: {
                    price: price.specialPrice.price,
                    minimumQty: price.specialPrice.minimumQty,
                    profit: price.specialPrice.profit,
                  },
                }
              : undefined,
          })),
        },
        perKiloPrice: perKiloPrice
          ? {
              create: perKiloPrice,
            }
          : undefined,
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

  async editProduct(id: string, formData: EditProductFormData) {
    // Extract file from form data
    const picture = formData.picture;

    // Parse JSON strings from form data
    const name = formData.name;
    const sackPrice = formData.sackPrice ? JSON.parse(formData.sackPrice) : [];
    const perKiloPrice = formData.perKiloPrice
      ? JSON.parse(formData.perKiloPrice)
      : null;

    // Upload the picture if provided
    const url = picture
      ? await this.uploadService.uploadSingleFile(picture, 'products/')
      : null;

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        name,
        ...(url && { picture: url }),
        SackPrice: {
          update: sackPrice.map(
            (price: {
              id: string;
              price: number;
              type?: string;
              stock?: number;
              profit?: number;
              specialPrice?: {
                id: string;
                price?: number;
                minimumQty?: number;
                profit?: number;
              };
            }) => ({
              where: {
                id: price.id,
              },
              data: {
                price: price.price,
                type: price.type,
                stock: price.stock,
                profit: price.profit,
                specialPrice: price.specialPrice
                  ? {
                      update: {
                        where: {
                          id: price.specialPrice.id,
                        },
                        data: {
                          price: price.specialPrice.price,
                          minimumQty: price.specialPrice.minimumQty,
                          profit: price.specialPrice.profit,
                        },
                      },
                    }
                  : undefined,
              },
            }),
          ),
        },
        perKiloPrice: perKiloPrice
          ? {
              update: perKiloPrice,
            }
          : undefined,
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
