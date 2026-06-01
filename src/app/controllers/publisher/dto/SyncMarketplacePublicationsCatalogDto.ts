import { ApiPropertyOptional } from '@nestjs/swagger';
import type { SyncMarketplacePublicationsCatalogInput } from 'src/core/interactors/import-marketplaces/SyncMarketplacePublicationsCatalog';

export class SyncMarketplacePublicationsCatalogDto implements SyncMarketplacePublicationsCatalogInput {
  @ApiPropertyOptional({
    example: ['oncity', 'fravega'],
    description:
      'Marketplaces a sincronizar. Si no se envia, sincroniza oncity y fravega.',
  })
  marketplaces?: Array<'oncity' | 'fravega'>;
}
