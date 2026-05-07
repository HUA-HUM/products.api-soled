import { UpdateFravegaPriceRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRequest';
import { UpdateFravegaPriceResponse } from 'src/core/entitis/marketplace-api/fravega/products/update-price/UpdateFravegaPriceResponse';

export interface IUpdateFravegaPriceRepository {
  updateByRefId(refId: string, payload: UpdateFravegaPriceRequest): Promise<UpdateFravegaPriceResponse>;
}
