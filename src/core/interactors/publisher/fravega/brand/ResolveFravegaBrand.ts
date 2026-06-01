import { Inject, Injectable } from '@nestjs/common';
import type { IGetFravegaBrandIdRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetBrandId/IGetFravegaBrandIdRepository';

const DEFAULT_FRAVEGA_BRAND_ID = '67b5fb6f4200008f871040e3';

@Injectable()
export class ResolveFravegaBrand {
  constructor(
    @Inject('IGetFravegaBrandIdRepository')
    private readonly repository: IGetFravegaBrandIdRepository,
  ) {}

  async execute(product: { brand?: string | null }): Promise<string> {
    const brand = product.brand;

    if (!brand) {
      return DEFAULT_FRAVEGA_BRAND_ID;
    }

    try {
      const exactMatch = await this.repository.findByName(brand);

      if (!exactMatch) {
        return DEFAULT_FRAVEGA_BRAND_ID;
      }

      return exactMatch.id;
    } catch {
      return DEFAULT_FRAVEGA_BRAND_ID;
    }
  }
}
