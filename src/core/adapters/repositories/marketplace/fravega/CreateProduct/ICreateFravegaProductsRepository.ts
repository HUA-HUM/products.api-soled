import { CreateFravegaProductsResponse } from 'src/core/entitis/marketplace-api/fravega/CreateProducts/CreateFravegaProductsResponse';

export interface ICreateFravegaProductsRepository {
  create(body: any): Promise<CreateFravegaProductsResponse>;
}
