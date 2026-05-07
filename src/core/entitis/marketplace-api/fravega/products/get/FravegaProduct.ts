export interface FravegaProduct {
  id: string;
  sku: string;
  ean?: string;
  title?: string;
  subTitle?: string;
  brandId?: string;
  countryId?: string;
  refId?: string | null;
  primaryCategoryId?: string;
  description?: string;
  active?: boolean;
  sellerId?: string;
  images?: string[];
  dimensions?: {
    height?: number;
    length?: number;
    weight?: number;
    width?: number;
  };
  itemState?: string;
  status?: {
    code?: string;
    message?: string;
  };
  price?: {
    list?: number;
    sale?: number;
    net?: number;
  };
  stock?: {
    quantity?: number;
  };
  attributes?: Array<{
    a?: string;
    t?: string;
    v?: unknown;
  }>;
  requiredAttributes?: Array<{
    groupName?: string;
    type?: string;
    name?: string;
    description?: string;
    valueOptions?: Array<{ t?: string; v?: unknown }>;
    ID?: string;
    required?: boolean;
    unit?: {
      id?: string;
      symbol?: string;
      name?: string;
      plural?: string;
    };
  }>;
  stockByWh?: Array<{
    quantity?: number;
    warehouseId?: string;
  }>;
  origin?: string;
}
