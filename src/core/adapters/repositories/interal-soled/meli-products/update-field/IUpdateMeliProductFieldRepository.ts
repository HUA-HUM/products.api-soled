import type {
  UpdateMeliProductFieldRequest,
  UpdateMeliProductFieldResponse,
} from 'src/core/entitis/internal-soled/meli-products/update-field/UpdateMeliProductField';

export interface IUpdateMeliProductFieldRepository {
  updateField(
    meliItemId: string,
    input: UpdateMeliProductFieldRequest,
  ): Promise<UpdateMeliProductFieldResponse>;
}
