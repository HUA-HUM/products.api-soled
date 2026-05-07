export interface OnCityUpdateProductRequest {
  id: string;
  externalId: string;
  status: 'active' | 'inactive';

  name: string;
  description: string;

  brandId: string;
  categoryIds: string[];

  specs: any[];
  attributes: any[];

  slug: string;

  images: {
    id: string;
    url: string;
    alt?: string;
  }[];

  skus: {
    id: string;
    externalId: string;
    name: string;
    ean: string;
    isActive: boolean;
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
}
