import {
  CreateOnCityProductRequest,
  CreateOnCityProductResponse
} from 'src/core/entitis/marketplace-api/oncity/CreateProducts/CreateOnCityProduct';

export interface ICreateOnCityProductsRepository {
  createProduct(body: CreateOnCityProductRequest): Promise<CreateOnCityProductResponse>;
}
