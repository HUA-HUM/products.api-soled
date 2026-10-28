import { Injectable } from '@nestjs/common';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import type { MarketplacePublicationResponse } from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import { sanitizeFravegaRefId } from 'src/core/interactors/publisher/fravega/payload/sanitizeFravegaRefId';

// Las publicaciones de Fravega se guardan con el SKU sin espacios ni simbolos
// ("KT 22" -> "KT22"), asi que buscar solo por el SKU exacto de MELI no las
// encuentra. Se busca tambien la variante sanitizada, solo en Fravega para no
// cruzar SKUs de otros marketplaces.
@Injectable()
export class FindPublicationsForMeliSku {
  constructor(
    private readonly marketplacePublications: MarketplacePublicationRepository,
  ) {}

  async execute(sku: string): Promise<MarketplacePublicationResponse[]> {
    const exact = await this.marketplacePublications.list({
      sku,
      limit: 100,
      offset: 0,
    });
    const variant = sanitizeFravegaRefId(sku);

    if (!variant || variant === sku) {
      return exact.items;
    }

    const sanitized = await this.marketplacePublications.list({
      sku: variant,
      marketplace: 'fravega',
      limit: 100,
      offset: 0,
    });
    const byKey = new Map<string, MarketplacePublicationResponse>();

    for (const publication of [...exact.items, ...sanitized.items]) {
      byKey.set(
        String(
          publication.id ?? `${publication.marketplace}:${publication.sku}`,
        ),
        publication,
      );
    }

    return [...byKey.values()];
  }
}
