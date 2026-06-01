import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PublisherService } from 'src/app/services/publisher/publisher.service';
import type {
  CreatePublisherJobResponse,
  ListPublisherJobsParams,
  ListPublisherJobsResponse,
  PublisherJobResponse,
  PublisherJobStatus,
} from 'src/core/entitis/internal-soled/publisher/PublisherJob';
import type { RetryPublisherRunResponse } from 'src/core/entitis/internal-soled/publisher/PublisherRun';
import type { SyncMarketplacePublicationsCatalogSummary } from 'src/core/interactors/import-marketplaces/SyncMarketplacePublicationsCatalog';
import { CreatePublisherJobDto } from './dto/CreatePublisherJobDto';
import { SyncMarketplacePublicationsCatalogDto } from './dto/SyncMarketplacePublicationsCatalogDto';

@ApiTags('Publisher')
@Controller('publisher')
export class PublisherController {
  constructor(private readonly publisherService: PublisherService) {}

  @Post('jobs')
  @ApiOperation({
    summary: 'Crear job de publicacion desde Odoo',
    description:
      'Recibe SKUs y marketplaces desde Odoo, delega la creacion del job/runs en Internal Soled, encola cada run en BullMQ y devuelve el job creado.',
  })
  @ApiBody({ type: CreatePublisherJobDto })
  @ApiOkResponse({
    description: 'Job creado en Internal Soled.',
    schema: {
      example: {
        jobId: 'pub_20260528_001',
        status: 'queued',
        totalItems: 2,
        items: [
          {
            runId: 'pub_20260528_001_oncity_RMS-2M-NEG',
            sku: 'RMS-2M-NEG',
            marketplace: 'oncity',
            status: 'queued',
          },
        ],
      },
    },
  })
  async createJob(
    @Body() body: CreatePublisherJobDto,
  ): Promise<CreatePublisherJobResponse> {
    return this.publisherService.createJob(body);
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Listar jobs de publicacion',
    description:
      'Proxy hacia Internal Soled para consultar jobs creados por Odoo/products.api.',
  })
  @ApiQuery({ name: 'status', required: false, example: 'queued' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiOkResponse({
    description: 'Listado paginado de jobs.',
  })
  async listJobs(
    @Query('status') status?: PublisherJobStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListPublisherJobsResponse> {
    const params: ListPublisherJobsParams = {
      status,
      limit: this.parseNumber(limit),
      offset: this.parseNumber(offset),
    };

    return this.publisherService.listJobs(params);
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Consultar progreso de job',
    description:
      'Devuelve el estado general del job y el estado de cada run SKU + marketplace.',
  })
  @ApiParam({ name: 'jobId', example: 'pub_20260528_001' })
  @ApiOkResponse({
    description: 'Detalle del job.',
  })
  async getJob(@Param('jobId') jobId: string): Promise<PublisherJobResponse> {
    return this.publisherService.getJob(jobId);
  }

  @Post('runs/:runId/retry')
  @ApiOperation({
    summary: 'Reintentar run de publicacion',
    description:
      'Pide a Internal Soled volver a dejar en cola un run fallido o pendiente.',
  })
  @ApiParam({
    name: 'runId',
    example: 'pub_20260528_001_oncity_RMS-2M-NEG',
  })
  @ApiOkResponse({
    description: 'Run marcado para reintento.',
  })
  async retryRun(
    @Param('runId') runId: string,
  ): Promise<RetryPublisherRunResponse> {
    return this.publisherService.retryRun(runId);
  }

  @Post('marketplace-publications/sync')
  @ApiOperation({
    summary: 'Sincronizar catalogo publicado desde marketplaces',
    description:
      'Consulta catalogos de OnCity y/o Fravega desde api.marketplace y vuelca los productos en marketplace_product_publications via Internal Soled.',
  })
  @ApiBody({ type: SyncMarketplacePublicationsCatalogDto, required: false })
  @ApiOkResponse({
    description: 'Resumen de sincronizacion por marketplace.',
    schema: {
      example: {
        marketplaces: [
          {
            marketplace: 'oncity',
            pagesProcessed: 3,
            productsFound: 250,
            productsSynced: 250,
            errors: [],
          },
        ],
      },
    },
  })
  async syncMarketplacePublications(
    @Body() body: SyncMarketplacePublicationsCatalogDto = {},
  ): Promise<SyncMarketplacePublicationsCatalogSummary> {
    return this.publisherService.syncMarketplacePublications(body);
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
