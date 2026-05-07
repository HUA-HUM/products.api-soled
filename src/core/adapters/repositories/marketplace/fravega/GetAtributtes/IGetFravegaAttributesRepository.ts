import { FravegaCategoryAttribute } from 'src/core/entitis/marketplace-api/fravega/GetAtributtes/FravegaCategoryAttribute';

export interface IGetFravegaAttributesRepository {
  getByCategoryId(categoryId: string): Promise<FravegaCategoryAttribute[]>;
}
