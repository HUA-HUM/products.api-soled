export type OnCityCreateProductImage = {
  id: string;
  url: string;
  alt?: string;
};

export type OnCityCreateProductDimension = {
  width: number;
  height: number;
  length: number;
};

export type OnCityCreateProductSku = {
  externalId: string;
  name: string;
  ean: string;
  isActive: boolean;
  weight: number;
  dimensions: OnCityCreateProductDimension;
  specs: unknown[];
  images: string[];
};

export type CreateOnCityProductRequest = {
  externalId: string;
  status: 'active' | 'inactive';
  name: string;
  description: string;
  brandId: string;
  categoryIds: string[];
  specs: unknown[];
  attributes: unknown[];
  slug: string;
  images: OnCityCreateProductImage[];
  skus: OnCityCreateProductSku[];
  origin: string;
};

export type CreateOnCityProductResponse = {
  success: boolean;
  message?: string;
  raw: unknown;
};
