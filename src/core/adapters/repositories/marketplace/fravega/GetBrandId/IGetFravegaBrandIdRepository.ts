import { GetFravegaBrandResponse } from 'src/core/entitis/marketplace-api/fravega/GetBrandId/GetFravegaBrandResponse';

export interface IGetFravegaBrandIdRepository {
  getByMeliBrand(brand: string): Promise<GetFravegaBrandResponse>;
}
