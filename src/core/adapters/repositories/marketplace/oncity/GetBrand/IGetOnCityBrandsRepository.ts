import { OnCityBrand } from 'src/core/entitis/marketplace-api/oncity/GetBrand/GetOnCityBrandsResponse';

export interface IGetOnCityBrandsRepository {
  getAll(): Promise<OnCityBrand[]>;
  findByName(name: string): Promise<OnCityBrand | null>;
}

export type { OnCityBrand };
