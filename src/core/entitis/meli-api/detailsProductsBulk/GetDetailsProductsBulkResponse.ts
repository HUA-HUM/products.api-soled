import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';

export type GetDetailsProductsBulkRequest = {
  itemIds: string[];
};

export type GetDetailsProductsBulkResponse =
  | GetDetailsProductsResponse[]
  | {
      products?: GetDetailsProductsResponse[];
      items?: GetDetailsProductsResponse[];
      data?: GetDetailsProductsResponse[];
      results?: GetDetailsProductsResponse[];
      notFound?: string[];
    };
