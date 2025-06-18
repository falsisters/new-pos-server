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

  async getAllPublicProducts() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
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

  async getPublicProductById(id: string) {
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
        // Only create SackPrice if array is not empty
        ...(sackPrice &&
          sackPrice.length > 0 && {
            SackPrice: {
              create: sackPrice.map((price) => ({
                price: price.price,
                type: price.type,
                stock: price.stock,
                ...(price.profit !== undefined &&
                  price.profit !== null && { profit: price.profit }),
                specialPrice: price.specialPrice
                  ? {
                      create: {
                        price: price.specialPrice.price,
                        minimumQty: price.specialPrice.minimumQty,
                        ...(price.specialPrice.profit !== undefined &&
                          price.specialPrice.profit !== null && {
                            profit: price.specialPrice.profit,
                          }),
                      },
                    }
                  : undefined,
              })),
            },
          }),
        perKiloPrice: perKiloPrice
          ? {
              create: {
                price: perKiloPrice.price,
                stock: perKiloPrice.stock,
                ...(perKiloPrice.profit !== undefined &&
                  perKiloPrice.profit !== null && {
                    profit: perKiloPrice.profit,
                  }),
              },
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

    // Get current product to check existing relations
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        perKiloPrice: true,
      },
    });

    if (!currentProduct) {
      throw new Error('Product not found');
    }

    // Handle SackPrice operations
    const sackPriceOperations = {
      update: [],
      create: [],
      deleteMany: false,
    };

    // If sackPrice is empty array, mark for deletion of all existing SackPrice records
    if (!sackPrice || sackPrice.length === 0) {
      if (currentProduct.SackPrice && currentProduct.SackPrice.length > 0) {
        sackPriceOperations.deleteMany = true;
      }
    } else {
      // Process non-empty sackPrice array
      sackPrice.forEach(
        (price: {
          id?: string;
          price: number;
          type?: string;
          stock?: number;
          profit?: number;
          specialPrice?: {
            id?: string;
            price?: number;
            minimumQty?: number;
            profit?: number;
          };
        }) => {
          if (price.id) {
            // Update existing SackPrice
            const updateData: any = {
              where: { id: price.id },
              data: {
                price: price.price,
                type: price.type,
                stock: price.stock,
                ...(price.profit !== undefined &&
                  price.profit !== null && { profit: price.profit }),
              },
            };

            // Handle SpecialPrice for existing SackPrice
            if (price.specialPrice) {
              if (price.specialPrice.id) {
                // Update existing SpecialPrice
                updateData.data.specialPrice = {
                  update: {
                    where: { id: price.specialPrice.id },
                    data: {
                      price: price.specialPrice.price,
                      minimumQty: price.specialPrice.minimumQty,
                      ...(price.specialPrice.profit !== undefined &&
                        price.specialPrice.profit !== null && {
                          profit: price.specialPrice.profit,
                        }),
                    },
                  },
                };
              } else {
                // Create new SpecialPrice
                updateData.data.specialPrice = {
                  create: {
                    price: price.specialPrice.price,
                    minimumQty: price.specialPrice.minimumQty,
                    ...(price.specialPrice.profit !== undefined &&
                      price.specialPrice.profit !== null && {
                        profit: price.specialPrice.profit,
                      }),
                  },
                };
              }
            }

            sackPriceOperations.update.push(updateData);
          } else {
            // Create new SackPrice
            const createData: any = {
              price: price.price,
              type: price.type,
              stock: price.stock,
              ...(price.profit !== undefined &&
                price.profit !== null && { profit: price.profit }),
            };

            if (price.specialPrice) {
              createData.specialPrice = {
                create: {
                  price: price.specialPrice.price,
                  minimumQty: price.specialPrice.minimumQty,
                  ...(price.specialPrice.profit !== undefined &&
                    price.specialPrice.profit !== null && {
                      profit: price.specialPrice.profit,
                    }),
                },
              };
            }

            sackPriceOperations.create.push(createData);
          }
        },
      );
    }

    // Handle PerKiloPrice operations
    let perKiloPriceOperation = {};
    if (perKiloPrice) {
      if (currentProduct.perKiloPrice) {
        // Update existing PerKiloPrice
        perKiloPriceOperation = {
          update: {
            price: perKiloPrice.price,
            stock: perKiloPrice.stock,
            ...(perKiloPrice.profit !== undefined &&
              perKiloPrice.profit !== null && { profit: perKiloPrice.profit }),
          },
        };
      } else {
        // Create new PerKiloPrice
        perKiloPriceOperation = {
          create: {
            price: perKiloPrice.price,
            stock: perKiloPrice.stock,
            ...(perKiloPrice.profit !== undefined &&
              perKiloPrice.profit !== null && { profit: perKiloPrice.profit }),
          },
        };
      }
    } else if (currentProduct.perKiloPrice) {
      // Delete existing PerKiloPrice
      perKiloPriceOperation = {
        delete: true,
      };
    }

    // Build the update data
    const updateData: any = {
      name,
      ...(url && { picture: url }),
    };

    // Add SackPrice operations
    if (sackPriceOperations.deleteMany) {
      // Delete all existing SackPrice records
      updateData.SackPrice = {
        deleteMany: {},
      };
    } else if (
      sackPriceOperations.update.length > 0 ||
      sackPriceOperations.create.length > 0
    ) {
      updateData.SackPrice = {};

      if (sackPriceOperations.update.length > 0) {
        updateData.SackPrice.update = sackPriceOperations.update;
      }

      if (sackPriceOperations.create.length > 0) {
        updateData.SackPrice.create = sackPriceOperations.create;
      }
    }

    // Add PerKiloPrice operation if there is one
    if (Object.keys(perKiloPriceOperation).length > 0) {
      updateData.perKiloPrice = perKiloPriceOperation;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
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
      orderBy: { name: 'asc' },
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
