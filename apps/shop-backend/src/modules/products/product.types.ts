export enum ProductSizeType {
  LETTER = 'letter',
  DIMENSION = 'dimension',
}
export interface ProductColor {
  name: string;
  hex?: string;
}
export interface ProductSize {
  label: string;
  widthCm?: number;
  lengthCm?: number;
}
export interface ProductVariantData {
  color?: string;
  size?: string;
  stock: number;
  lowStockThreshold?: number | null;
  lowStockNotified?: boolean;
}
