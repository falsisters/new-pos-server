import { PrismaClient, SackType } from '@prisma/client';

const prisma = new PrismaClient();

const userId = 'cm8k0u3ug0000lb03jk9b3adf';

async function main() {
  type Product = {
    name: string;
    userId: string;
    SackPrice: {
      price: number;
      type: SackType;
      stock: number;
      specialPrice?: {
        price: number;
        minimumQty: number;
      };
    }[];
    perKiloPrice?: {
      price: number;
      stock: number;
    };
  };

  const azucena: Product = {
    name: 'Azucena',
    userId,
    SackPrice: [
      {
        price: 1250,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1230,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 55,
      stock: 100,
    },
  };

  const sweetRice: Product = {
    name: 'Sweet Rice',
    userId,
    SackPrice: [
      {
        price: 2370,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 2350,
          minimumQty: 20,
        },
      },
      {
        price: 1190,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1170,
          minimumQty: 40,
        },
      },
      {
        price: 280,
        type: SackType.FIVE_KG,
        stock: 100,
      },
    ],
    perKiloPrice: {
      price: 53,
      stock: 100,
    },
  };

  const sinandomeng: Product = {
    name: 'Sinandomeng',
    userId,
    SackPrice: [
      {
        price: 2350,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 2330,
          minimumQty: 20,
        },
      },
      {
        price: 1180,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1160,
          minimumQty: 40,
        },
      },
      {
        price: 275,
        type: SackType.FIVE_KG,
        stock: 100,
      },
    ],
    perKiloPrice: {
      price: 52,
      stock: 100,
    },
  };

  const wellMilledRice: Product = {
    name: 'Well Milled Rice',
    userId,
    SackPrice: [
      {
        price: 2320,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 2300,
          minimumQty: 20,
        },
      },
      {
        price: 1165,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1145,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 51,
      stock: 100,
    },
  };

  const regularMilledRice: Product = {
    name: 'Regular Milled Rice',
    userId,
    SackPrice: [
      {
        price: 2090,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 2070,
          minimumQty: 20,
        },
      },
      {
        price: 1050,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1030,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 50,
      stock: 100,
    },
  };

  const redRice: Product = {
    name: 'Red Rice',
    userId,
    SackPrice: [
      {
        price: 3100,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3080,
          minimumQty: 20,
        },
      },
      {
        price: 1550,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1530,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 66,
      stock: 100,
    },
  };

  const blackRice: Product = {
    name: 'Black Rice',
    userId,
    SackPrice: [
      {
        price: 3300,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3280,
          minimumQty: 20,
        },
      },
      {
        price: 1650,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1630,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 70,
      stock: 100,
    },
  };

  const brownRice: Product = {
    name: 'Brown Rice',
    userId,
    SackPrice: [
      {
        price: 3100,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3080,
          minimumQty: 20,
        },
      },
    ],
    perKiloPrice: {
      price: 66,
      stock: 100,
    },
  };

  const monggoGreen: Product = {
    name: 'Monggo Green',
    userId,
    SackPrice: [
      {
        price: 3300,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3280,
          minimumQty: 20,
        },
      },
      {
        price: 1650,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1630,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 75,
      stock: 100,
    },
  };

  const mascuvadoDark: Product = {
    name: 'Mascuvado Dark',
    userId,
    SackPrice: [
      {
        price: 3800,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3780,
          minimumQty: 20,
        },
      },
    ],
    perKiloPrice: {
      price: 77,
      stock: 100,
    },
  };

  const mascuvadoLight: Product = {
    name: 'Mascuvado Light',
    userId,
    SackPrice: [
      {
        price: 3600,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3580,
          minimumQty: 20,
        },
      },
    ],
  };

  const convertedRice: Product = {
    name: 'Converted Rice',
    userId,
    SackPrice: [
      {
        price: 3200,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 3180,
          minimumQty: 20,
        },
      },
      {
        price: 1180,
        type: SackType.TWENTY_FIVE_KG,
        stock: 100,
        specialPrice: {
          price: 1160,
          minimumQty: 40,
        },
      },
    ],
    perKiloPrice: {
      price: 78,
      stock: 100,
    },
  };

  const binlod: Product = {
    name: 'Binlod',
    userId,
    SackPrice: [
      {
        price: 1500,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 1480,
          minimumQty: 20,
        },
      },
    ],
    perKiloPrice: {
      price: 30,
      stock: 100,
    },
  };

  const pilit: Product = {
    name: 'Pilit',
    userId,
    SackPrice: [
      {
        price: 2380,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 2360,
          minimumQty: 20,
        },
      },
    ],
    perKiloPrice: {
      price: 54,
      stock: 100,
    },
  };

  const menor: Product = {
    name: 'Menor',
    userId,
    SackPrice: [
      {
        price: 2050,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 2360,
          minimumQty: 20,
        },
      },
    ],
    perKiloPrice: {
      price: 44,
      stock: 100,
    },
  };

  const asin: Product = {
    name: 'Asin',
    userId,
    SackPrice: [
      {
        price: 400,
        type: SackType.FIFTY_KG,
        stock: 100,
        specialPrice: {
          price: 380,
          minimumQty: 30,
        },
      },
    ],
    perKiloPrice: {
      price: 25,
      stock: 100,
    },
  };

  const products = [
    azucena,
    sweetRice,
    sinandomeng,
    wellMilledRice,
    regularMilledRice,
    redRice,
    blackRice,
    brownRice,
    monggoGreen,
    mascuvadoDark,
    mascuvadoLight,
    convertedRice,
    binlod,
    pilit,
    menor,
    asin,
  ];

  // Create all products with their related data
  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        userId: product.userId,
        SackPrice: {
          createMany: {
            data: product.SackPrice.map((sp) => ({
              price: sp.price,
              type: sp.type,
              stock: sp.stock,
            })),
          },
        },
        perKiloPrice: product.perKiloPrice
          ? {
              create: {
                price: product.perKiloPrice.price,
                stock: product.perKiloPrice.stock,
              },
            }
          : undefined,
      },
    });

    // Create special prices separately since createMany doesn't support nested creates
    for (const sackPrice of product.SackPrice) {
      if (sackPrice.specialPrice) {
        const dbSackPrice = await prisma.sackPrice.findFirst({
          where: {
            productId: createdProduct.id,
            type: sackPrice.type,
          },
        });

        if (dbSackPrice) {
          await prisma.specialPrice.create({
            data: {
              price: sackPrice.specialPrice.price,
              minimumQty: sackPrice.specialPrice.minimumQty,
              sackPriceId: dbSackPrice.id,
            },
          });
        }
      }
    }
  }

  console.log(`Created ${products.length} products with their price data`);
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
