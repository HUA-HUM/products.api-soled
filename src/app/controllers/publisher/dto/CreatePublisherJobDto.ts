import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreatePublisherJobRequest } from 'src/core/entitis/internal-soled/publisher/PublisherJob';

class PublisherRequestedByDto {
  @ApiPropertyOptional({ example: 2 })
  odooUserId?: number;

  @ApiPropertyOptional({ example: 'Administrator' })
  name?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  email?: string;
}

class PublisherOptionsDto {
  @ApiPropertyOptional({ example: true })
  useAiEnrichment?: boolean;

  @ApiPropertyOptional({ example: 'queue' })
  publishMode?: string;

  @ApiPropertyOptional({ example: false })
  forceRepublish?: boolean;
}

export class CreatePublisherJobDto implements CreatePublisherJobRequest {
  @ApiProperty({ example: 'mercadolibre' })
  source: string;

  @ApiProperty({ example: ['RMS-2M-NEG', 'PC18CW'] })
  skus: string[];

  @ApiProperty({ example: ['oncity', 'fravega'] })
  marketplaces: string[];

  @ApiPropertyOptional({ type: PublisherRequestedByDto })
  requestedBy?: PublisherRequestedByDto;

  @ApiPropertyOptional({ type: PublisherOptionsDto })
  options?: PublisherOptionsDto;

  @ApiPropertyOptional({ example: 'odoo_2_20260528_001' })
  idempotencyKey?: string;
}
