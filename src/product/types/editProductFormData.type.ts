export interface EditProductFormData {
  name: string;
  picture?: Express.Multer.File;
  sackPrice: string; // Will be parsed as JSON
  perKiloPrice?: string; // Will be parsed as JSON
}
