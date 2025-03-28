export interface ProductFormData {
  picture: Express.Multer.File;
  name: string;
  sackPrice: string; // JSON string that will be parsed to SackPriceDto[]
  perKiloPrice: string; // JSON string that will be parsed to PerKiloPrice
}
