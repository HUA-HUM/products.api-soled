export interface OnCityRawProductImage {
  ImageUrl: string;
  ImageName?: string | null;
  FileId?: string | null;
}

export interface OnCityRawProductDimension {
  cubicweight?: number;
  height?: number;
  length?: number;
  weight?: number;
  width?: number;
}

export interface OnCityRawProductAlternateIds {
  RefId?: string | null;
  Ean?: string | null;
}

export interface OnCityRawProduct {
  Id: number;
  ProductId: number;
  NameComplete?: string | null;
  ProductName?: string | null;
  ProductDescription?: string | null;
  SkuName?: string | null;
  IsActive?: boolean | null;
  IsProductActive?: boolean | null;
  DetailUrl?: string | null;
  BrandId?: string | null;
  BrandName?: string | null;
  Dimension?: OnCityRawProductDimension | null;
  Images?: OnCityRawProductImage[] | null;
  ProductCategoryIds?: string | null;
  ProductCategories?: Record<string, string> | null;
  AlternateIds?: OnCityRawProductAlternateIds | null;
  AlternateIdValues?: string[] | null;
  SkuSpecifications?: any[] | null;
  ProductSpecifications?: any[] | null;
}
