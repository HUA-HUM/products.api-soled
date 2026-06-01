import { Injectable, Logger } from '@nestjs/common';
import { InteranlSoledHttpError } from 'src/core/drivers/repositories/internal-soled/http/errors/InteranlSoledHttpError';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetMeliProductBySkuRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/get-by-sku/GetMeliProductBySkuRepository';
import { GetPublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/GetPublisherRunRepository';
import { UpdatePublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/UpdatePublisherRunRepository';
import type { PublisherRunStatus } from 'src/core/entitis/internal-soled/publisher/PublisherRun';
import { PublishFravegaProduct } from '../../fravega/PublishFravegaProduct';
import type { PublishResult as FravegaPublishResult } from '../../fravega/PublishFravegaProduct';
import { PublishOncityProduct } from '../../oncity/PublishOncityProduct';
import type { PublishResult as OncityPublishResult } from '../../oncity/PublishOncityProduct';

type PublisherResult = FravegaPublishResult | OncityPublishResult;

@Injectable()
export class ProcessPublisherRun {
  private readonly logger = new Logger(ProcessPublisherRun.name);

  constructor(
    private readonly getPublisherRun: GetPublisherRunRepository,
    private readonly updatePublisherRun: UpdatePublisherRunRepository,
    private readonly marketplacePublication: MarketplacePublicationRepository,
    private readonly getMeliProductBySku: GetMeliProductBySkuRepository,
    private readonly publishOncityProduct: PublishOncityProduct,
    private readonly publishFravegaProduct: PublishFravegaProduct,
  ) {}

  async execute(runId: string): Promise<void> {
    const run = await this.getPublisherRun.getByRunId(runId);

    await this.updatePublisherRun.updateStatus(runId, {
      status: 'processing',
      message: 'Validando publicacion existente',
    });

    const existingPublication = await this.findExistingPublication(
      run.marketplace,
      run.sku,
    );

    if (existingPublication) {
      await this.updatePublisherRun.updateSnapshots(runId, {
        responseSnapshot: existingPublication,
      });
      await this.updatePublisherRun.updateStatus(runId, {
        status: 'skipped',
        message: `Producto ya existe en ${run.marketplace}`,
      });

      this.logger.log(
        `[PUBLISHER-RUN] Product already exists | runId=${runId} sku=${run.sku} marketplace=${run.marketplace}`,
      );
      return;
    }

    await this.updatePublisherRun.updateStatus(runId, {
      status: 'processing',
      message: 'Buscando producto base en Mercado Libre products',
    });

    const product = await this.getMeliProductBySku.getBySku(run.sku);

    await this.updatePublisherRun.updateSnapshots(runId, {
      sourceProductSnapshot: product,
    });

    await this.updatePublisherRun.updateStatus(runId, {
      status: 'processing',
      message: `Armando payload y publicando en ${run.marketplace}`,
    });

    const result = await this.publish(run.marketplace, product);

    await this.updatePublisherRun.updateSnapshots(runId, {
      payloadSnapshot: result.payload,
      responseSnapshot: result.response,
    });

    await this.updatePublisherRun.updateStatus(runId, {
      status: this.mapPublishStatus(result.status),
      message: result.message ?? this.buildDefaultMessage(result.status),
      errorCode: result.status === 'failed' ? 'PUBLISHER_FAILED' : undefined,
      errorMessage: result.status === 'failed' ? result.message : undefined,
    });
  }

  private async publish(
    marketplace: string,
    product: Parameters<PublishOncityProduct['execute']>[0],
  ): Promise<PublisherResult> {
    if (marketplace === 'oncity') {
      return this.publishOncityProduct.execute(product);
    }

    if (marketplace === 'fravega') {
      return this.publishFravegaProduct.execute(product);
    }

    return {
      status: 'failed',
      message: `UNSUPPORTED_MARKETPLACE_${marketplace.toUpperCase()}`,
      payload: {
        marketplace,
        sku: product.sku,
      },
      response: null,
    };
  }

  private mapPublishStatus(
    status: PublisherResult['status'],
  ): PublisherRunStatus {
    if (status === 'success') {
      return 'completed';
    }

    return status;
  }

  private buildDefaultMessage(status: PublisherResult['status']): string {
    if (status === 'success') {
      return 'Producto publicado correctamente';
    }

    if (status === 'skipped') {
      return 'Publicacion omitida';
    }

    return 'Publicacion fallida';
  }

  private async findExistingPublication(marketplace: string, sku: string) {
    try {
      return await this.marketplacePublication.getByMarketplaceAndSku(
        marketplace,
        sku,
      );
    } catch (error) {
      if (error instanceof InteranlSoledHttpError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }
}
