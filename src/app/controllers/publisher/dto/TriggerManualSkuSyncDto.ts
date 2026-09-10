import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerManualSkuSyncDto {
  @ApiPropertyOptional({
    example: ['oncity', 'fravega'],
    description:
      'Marketplaces a sincronizar para este sku. Si no se envia, intenta oncity y fravega (solo se encola en los que ya tengan una publicacion registrada).',
  })
  marketplaces?: Array<'oncity' | 'fravega'>;

  @ApiPropertyOptional({
    example: ['price', 'stock', 'status'],
    description:
      'Campos a sincronizar. Si no se envia, sincroniza precio, stock y status.',
  })
  fields?: Array<'price' | 'stock' | 'status'>;
}
