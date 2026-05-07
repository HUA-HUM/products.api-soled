import { OnCityUpdatePriceRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-price/UpdatePriceRequest';
import { OnCityUpdatePriceResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-price/UpdatePriceResponse';

export interface IUpdatePriceRepository {
  updatePrice(payload: OnCityUpdatePriceRequest): Promise<OnCityUpdatePriceResponse>;
}
