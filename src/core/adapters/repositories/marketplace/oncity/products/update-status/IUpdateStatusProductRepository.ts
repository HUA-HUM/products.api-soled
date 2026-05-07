import { OnCityUpdateProductRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductRequest';
import { OnCityUpdateProductResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductResponse';

export interface IUpdateStatusProductRepository {
  updateStatus(productId: string, payload: OnCityUpdateProductRequest): Promise<OnCityUpdateProductResponse>;
}
