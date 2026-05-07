export interface OnCityUpdateProductResponse {
  id: string;
  externalId: string;
  status: 'active' | 'inactive';

  name: string;
  description: string;

  brandId: string;
  brandName?: string;

  categoryIds: string[];
  categoryNames?: string[];

  specs: any[];
  attributes: any[];

  slug: string;

  images: {
    id: string;
    path?: string;
    url: string;
    alt?: string;
  }[];

  skus: {
    id: string;
    externalId: string;
    ean: string;
    isActive: boolean;
    name: string;
    weight: number;
    dimensions: {
      width: number;
      height: number;
      length: number;
    };
    specs: any[];
    images: string[];
  }[];

  origin: string;

  createdAt?: string;
  updatedAt?: string;
}
