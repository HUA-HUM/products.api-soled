import type { FravegaBrand } from 'src/core/entitis/marketplace-api/fravega/GetBrandId/GetFravegaBrandResponse';

export interface IGetFravegaBrandIdRepository {
  getAll(): Promise<FravegaBrand[]>;
  findByName(name: string): Promise<FravegaBrand | null>;
}
