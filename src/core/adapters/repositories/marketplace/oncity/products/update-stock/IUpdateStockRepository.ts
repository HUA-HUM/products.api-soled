import { OnCityUpdateStockRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-stock/UpdateStockRequest';
import { OnCityUpdateStockResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-stock/UpdateStockResponse';

export interface IUpdateStockRepository {
  updateStock(payload: OnCityUpdateStockRequest): Promise<OnCityUpdateStockResponse>;
}
