import type {
  GetDetailsProductsBulkRequest,
  GetDetailsProductsBulkResponse,
} from 'src/core/entitis/meli-api/detailsProductsBulk/GetDetailsProductsBulkResponse';

export interface IGetDetailsProductsBulkRepository {
  getByMlas(
    input: GetDetailsProductsBulkRequest,
  ): Promise<GetDetailsProductsBulkResponse>;
}
