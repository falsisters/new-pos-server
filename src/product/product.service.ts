import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { ProductFormData } from './types/productFormData.type';
import { EditProductFormData } from './types/editProductFormData.type';
import {
  convertObjectDatesToManilaTime,
  convertArrayDatesToManilaTime,
} from '../utils/date.util';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  private convertDecimalToString(
    value: Decimal | null | undefined,
  ): string | null {
    if (value === null || value === undefined) return null;
    return value.toString();
  }

  private convertDecimalFieldsToString(obj: any): any {
    if (!obj) return obj;

    const converted = { ...obj };

    if (converted.price !== undefined) {
      converted.price = this.convertDecimalToString(converted.price);
    }
    if (converted.profit !== undefined) {
      converted.profit = this.convertDecimalToString(converted.profit);
    }
    if (converted.stock !== undefined) {
      converted.stock = this.convertDecimalToString(converted.stock);
    }

    return converted;
  }

  private formatProduct(product: any) {
    if (!product) return null;
    const formatted = {
      ...product,
      SackPrice: product.SackPrice
        ? convertArrayDatesToManilaTime(
            product.SackPrice.map((price) => {
              const convertedPrice = this.convertDecimalFieldsToString(price);
              return {
                ...convertedPrice,
                specialPrice: price.specialPrice
                  ? this.convertDecimalFieldsToString(
                      convertObjectDatesToManilaTime(price.specialPrice),
                    )
                  : null,
              };
            }),
          )
        : [],
      perKiloPrice: product.perKiloPrice
        ? this.convertDecimalFieldsToString(
            convertObjectDatesToManilaTime(product.perKiloPrice),
          )
        : null,
      cashier: product.cashier
        ? convertObjectDatesToManilaTime(product.cashier)
        : null,
    };
    return convertObjectDatesToManilaTime(formatted);
  }

  private formatProducts(products: any[]) {
    return products.map((product) => this.formatProduct(product));
  }

  async getAllPublicProducts() {
    const products = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        perKiloPrice: true,
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });
    return this.formatProducts(products);
  }

  async getPublicProductById(id: string) {
    const result = await this.prisma.product.findUnique({
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
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });
    return this.formatProduct(result);
  }

  async createProduct(
    cashierId: string,
    formData: ProductFormData,
    userId: string,
  ) {
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

    const result = await this.prisma.product.create({
      data: {
        name,
        picture: url,
        cashierId, // Will be provided
        userId,
        // Only create SackPrice if array is not empty
        ...(sackPrice &&
          sackPrice.length > 0 && {
            SackPrice: {
              create: sackPrice.map((price) => ({
                price: price.price,
                type: price.type,
                stock: new Decimal(price.stock),
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
                stock: new Decimal(perKiloPrice.stock),
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
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });

    return this.formatProduct(result);
  }

  // New method for users to create products with cashier assignment
  async createProductForCashier(
    userId: string,
    cashierId: string,
    formData: ProductFormData,
  ) {
    // Verify cashier ownership
    const cashier = await this.verifyCashierOwnership(userId, cashierId);
    if (!cashier) {
      throw new Error('Cashier not found or does not belong to this user');
    }

    return this.createProduct(cashierId, formData, userId);
  }

  async editProduct(
    id: string,
    formData: EditProductFormData,
    cashierId?: string,
  ) {
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
                stock: new Decimal(price.stock),
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
              stock: new Decimal(price.stock),
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
            stock: new Decimal(perKiloPrice.stock),
            ...(perKiloPrice.profit !== undefined &&
              perKiloPrice.profit !== null && { profit: perKiloPrice.profit }),
          },
        };
      } else {
        // Create new PerKiloPrice
        perKiloPriceOperation = {
          create: {
            price: perKiloPrice.price,
            stock: new Decimal(perKiloPrice.stock),
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
      // Add cashierId if provided
      ...(cashierId && { cashierId }),
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

    const result = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        perKiloPrice: true,
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });

    return this.formatProduct(result);
  }

  async deleteProduct(id: string) {
    const result = await this.prisma.product.delete({
      where: {
        id,
      },
    });
    return this.formatProduct(result);
  }

  async getAllProducts(userId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          {
            cashier: {
              userId,
            },
          },
          {
            cashierId: null, // Include products without assigned cashiers for migration
            // You might want to add additional conditions here to limit this
          },
        ],
      },
      orderBy: { name: 'asc' },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        perKiloPrice: true,
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });
    return this.formatProducts(products);
  }

  async getAllProductsByCashier(cashierId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        cashierId,
      },
      orderBy: { name: 'asc' },
      include: {
        SackPrice: {
          include: {
            specialPrice: true,
          },
        },
        perKiloPrice: true,
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });
    return this.formatProducts(products);
  }

  async getProductById(id: string) {
    const result = await this.prisma.product.findUnique({
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
    return this.formatProduct(result);
  }

  async verifyCashierOwnership(userId: string, cashierId: string) {
    return this.prisma.cashier.findFirst({
      where: {
        id: cashierId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async verifyProductOwnership(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        OR: [
          {
            cashier: {
              userId: userId,
            },
          },
          {
            cashierId: null, // Allow editing products without cashiers during migration
          },
        ],
      },
      select: {
        id: true,
        cashierId: true,
        cashier: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error(
        'Product not found or you do not have permission to modify it',
      );
    }

    return product;
  }

  // New method to assign cashier to existing products
  async assignCashierToProduct(
    userId: string,
    productId: string,
    cashierId: string,
  ) {
    // Verify product ownership
    await this.verifyProductOwnership(userId, productId);

    // Verify cashier ownership
    const cashier = await this.verifyCashierOwnership(userId, cashierId);
    if (!cashier) {
      throw new Error('Cashier not found or does not belong to this user');
    }

    const result = await this.prisma.product.update({
      where: { id: productId },
      data: { cashierId },
      include: {
        cashier: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });

    return this.formatProduct(result);
  }

  // Get products without assigned cashiers for migration helper
  async getUnassignedProducts(userId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        cashierId: null,
        userId: userId, // Ensure these products belong to the user
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
    return this.formatProducts(products);
  }
}
