import { GetFravegaCategoryIdResponse } from 'src/core/entitis/marketplace-api/fravega/GetCategoryId/GetFravegaCategoryIdResponse';

export interface IGetFravegaCategoryIdRepository {
  getByMeliCategoryId(meliCategoryId: string): Promise<GetFravegaCategoryIdResponse>;
}
