import { Injectable } from '@nestjs/common';
import type { IGetDetailsProductsRepository } from 'src/core/adapters/repositories/meli-api/detailsProducts/IGetDetailsProductsRepository';
import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';
import { MeliHttpClient } from '../http/MeliHttpClient';

@Injectable()
export class GetDetailsProductsRepository implements IGetDetailsProductsRepository {
  constructor(private readonly httpClient: MeliHttpClient) {}

  async getByMla(mla: string): Promise<GetDetailsProductsResponse> {
    return this.httpClient.get<GetDetailsProductsResponse>(
      `/meli/products/${encodeURIComponent(mla)}`,
    );
  }
}
