export interface ProductFormData {
  picture: Express.Multer.File;
  name: string;
  sackPrice: string; // JSON string that will be parsed to SackPriceDto[]
  perKiloPrice: string; // JSON string that will be parsed to PerKiloPrice
}

// Enhanced type for frontend validation
export interface ProductFormDataWithValidation
  extends Omit<ProductFormData, 'picture'> {
  picture: File; // Frontend File type instead of Multer File
}

// Supported image formats for products
export const SUPPORTED_PRODUCT_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/tif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/gif',
] as const;

export const SUPPORTED_PRODUCT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.tif',
  '.avif',
  '.heic',
  '.heif',
  '.bmp',
  '.gif',
] as const;
