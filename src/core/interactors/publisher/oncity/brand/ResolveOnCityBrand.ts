import { Inject, Injectable } from '@nestjs/common';
import type { IGetOnCityBrandsRepository } from 'src/core/adapters/repositories/marketplace/oncity/GetBrand/IGetOnCityBrandsRepository';

@Injectable()
export class ResolveOnCityBrand {
  constructor(
    @Inject('IGetOnCityBrandsRepository')
    private readonly repository: IGetOnCityBrandsRepository,
  ) {}

  async execute(product: { brand?: string | null }): Promise<string | null> {
    const brand = product.brand?.trim();

    if (!brand) {
      return null;
    }

    try {
      const exactMatch = await this.repository.findByName(brand);

      if (exactMatch) {
        return String(exactMatch.id);
      }

      return null;
    } catch {
      return null;
    }
  }
}
