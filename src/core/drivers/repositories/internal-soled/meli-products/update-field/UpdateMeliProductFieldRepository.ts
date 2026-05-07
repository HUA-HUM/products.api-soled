import { Injectable } from '@nestjs/common';
import type { IUpdateMeliProductFieldRepository } from 'src/core/adapters/repositories/interal-soled/meli-products/update-field/IUpdateMeliProductFieldRepository';
import type {
  UpdateMeliProductFieldRequest,
  UpdateMeliProductFieldResponse,
} from 'src/core/entitis/internal-soled/meli-products/update-field/UpdateMeliProductField';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class UpdateMeliProductFieldRepository implements IUpdateMeliProductFieldRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async updateField(
    meliItemId: string,
    input: UpdateMeliProductFieldRequest,
  ): Promise<UpdateMeliProductFieldResponse> {
    return this.httpClient.patch<UpdateMeliProductFieldResponse>(
      `/internal/mercadolibre/products/${encodeURIComponent(meliItemId)}/field`,
      input,
    );
  }
}
