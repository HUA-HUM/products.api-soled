import { OnCityBrand } from '../marketplace/oncity/GetBrand/IGetOnCityBrandsRepository';

export interface IMatchOnCityBrandRepository {
  match(params: {
    brand: string;
    candidates: OnCityBrand[];
  }): Promise<string | null>;
}
