import { UpdateFravegaStockRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRequest';
import { UpdateFravegaStockResponse } from 'src/core/entitis/marketplace-api/fravega/products/update-stock/UpdateFravegaStockResponse';

export interface IUpdateFravegaStockRepository {
  updateByRefId(refId: string, payload: UpdateFravegaStockRequest): Promise<UpdateFravegaStockResponse>;
}
