import { FravegaProductsPaginatedResponse } from 'src/core/entitis/marketplace-api/fravega/products/get/FravegaProductsPaginatedResponse';

export interface IGetFravegaProductsRepository {
  execute(limit: number, offset: number): Promise<FravegaProductsPaginatedResponse>;
}
