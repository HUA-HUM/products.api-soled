import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';

export interface IGetDetailsProductsRepository {
  getByMla(mla: string): Promise<GetDetailsProductsResponse>;
}
