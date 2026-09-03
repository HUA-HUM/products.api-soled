import { Inject, Injectable } from '@nestjs/common';
import type { IGetOnCityBrandsRepository } from 'src/core/adapters/repositories/marketplace/oncity/GetBrand/IGetOnCityBrandsRepository';

// Marca generica ya registrada en OnCity, usada como fallback cuando la marca
// que llega de MELI no matchea ninguna marca real (dato sucio del vendedor,
// ej. "Grêmio" en vez del fabricante). Antes de este fallback, OnCity
// fallaba la publicacion entera (BRAND_NOT_FOUND) mientras que Fravega ya
// tenia su propio fallback para el mismo caso.
const DEFAULT_ONCITY_BRAND_NAME = 'Genérica';

@Injectable()
export class ResolveOnCityBrand {
  constructor(
    @Inject('IGetOnCityBrandsRepository')
    private readonly repository: IGetOnCityBrandsRepository,
  ) {}

  async execute(product: { brand?: string | null }): Promise<string | null> {
    const brand = product.brand?.trim();

    if (brand) {
      try {
        const exactMatch = await this.repository.findByName(brand);

        if (exactMatch) {
          return String(exactMatch.id);
        }
      } catch {
        // sigue al fallback
      }
    }

    try {
      const fallback = await this.repository.findByName(
        DEFAULT_ONCITY_BRAND_NAME,
      );

      return fallback ? String(fallback.id) : null;
    } catch {
      return null;
    }
  }
}
