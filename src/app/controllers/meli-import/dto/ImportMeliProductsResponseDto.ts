import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ImportMeliProductsErrorDto {
  @ApiProperty({
    description: 'Etapa donde ocurrio el error.',
    enum: ['detail', 'insert'],
    example: 'detail',
  })
  stage!: 'detail' | 'insert';

  @ApiPropertyOptional({
    description: 'MLA que fallo cuando el error corresponde al detalle.',
    example: 'MLA828961861',
  })
  meliItemId?: string;

  @ApiProperty({
    description: 'Mensaje tecnico del error capturado.',
    example: '[MELI GET] /meli/products/MLA828961861',
  })
  message!: string;
}

export class ImportMeliProductsResponseDto {
  @ApiProperty({
    description: 'Cantidad de paginas de IDs procesadas desde Meli.',
    example: 1,
  })
  pagesProcessed!: number;

  @ApiProperty({
    description: 'Cantidad de IDs encontrados en las paginas consultadas.',
    example: 50,
  })
  itemsFound!: number;

  @ApiProperty({
    description: 'Cantidad de productos consultados exitosamente en detalle.',
    example: 50,
  })
  detailsFetched!: number;

  @ApiProperty({
    description: 'Cantidad de productos insertados en Internal Soled.',
    example: 50,
  })
  productsInserted!: number;

  @ApiProperty({
    description: 'Cantidad de fallos al consultar detalles de productos.',
    example: 0,
  })
  detailFailures!: number;

  @ApiProperty({
    description:
      'Cantidad de productos no insertados por fallos de bulk insert.',
    example: 0,
  })
  insertFailures!: number;

  @ApiPropertyOptional({
    description:
      'Ultimo scroll_id recibido. Sirve para continuar una corrida parcial.',
    example:
      'eyJpZCI6Ik1MQTExMzc3ODA3NjAiLCJudW1lcmljX2lkIjoxMTM3NzgwNzYwLCJzdG9wX3RpbWUiOiIyMDQyLTA1LTEyVDA0OjAwOjAwLjAwMFoifQ==',
    nullable: true,
  })
  lastScrollId!: string | null;

  @ApiProperty({
    description:
      'Indica si Meli informo que todavia quedan paginas por procesar.',
    example: true,
  })
  hasNext!: boolean;

  @ApiProperty({
    description: 'Errores capturados durante la importacion.',
    type: [ImportMeliProductsErrorDto],
  })
  errors!: ImportMeliProductsErrorDto[];
}
