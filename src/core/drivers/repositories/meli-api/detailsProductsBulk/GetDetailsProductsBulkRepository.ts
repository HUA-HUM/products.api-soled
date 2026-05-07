import { Injectable } from '@nestjs/common';
import type { IGetDetailsProductsBulkRepository } from 'src/core/adapters/repositories/meli-api/detailsProductsBulk/IGetDetailsProductsBulkRepository';
import type {
  GetDetailsProductsBulkRequest,
  GetDetailsProductsBulkResponse,
} from 'src/core/entitis/meli-api/detailsProductsBulk/GetDetailsProductsBulkResponse';
import { MeliHttpClient } from '../http/MeliHttpClient';

@Injectable()
export class GetDetailsProductsBulkRepository implements IGetDetailsProductsBulkRepository {
  constructor(private readonly httpClient: MeliHttpClient) {}

  async getByMlas(
    input: GetDetailsProductsBulkRequest,
  ): Promise<GetDetailsProductsBulkResponse> {
    return this.httpClient.post<GetDetailsProductsBulkResponse>(
      '/meli/products/bulk',
      input,
    );
  }
}
