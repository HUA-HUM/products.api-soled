import { Module } from '@nestjs/common';
import { MercadoLibreWebhookController } from 'src/app/controllers/webhook/mercadolibre-webhook.controller';
import { PublisherQueueModule } from 'src/app/modules/publisher-queue/publisher-queue.module';
import { MarketplaceChangeActionsProcessor } from 'src/app/processors/marketplace-change-actions/MarketplaceChangeActionsProcessor';
import { MercadoLibreWebhookEventsProcessor } from 'src/app/processors/webhook/MercadoLibreWebhookEventsProcessor';
import { MarketplaceChangeActionsQueueService } from 'src/app/services/marketplace-change-actions/marketplace-change-actions-queue.service';
import { MercadoLibreWebhookQueueService } from 'src/app/services/webhook/mercadolibre-webhook-queue.service';
import { MercadoLibreWebhookService } from 'src/app/services/webhook/mercadolibre-webhook.service';
import { MarketplaceChangeActionRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-change-actions/MarketplaceChangeActionRepository';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetDetailsProductsRepository } from 'src/core/drivers/repositories/meli-api/detailsProducts/GetDetailsProductsRepository';
import { MeliHttpClient } from 'src/core/drivers/repositories/meli-api/http/MeliHttpClient';
import { InteranlSoledHttpClient } from 'src/core/drivers/repositories/internal-soled/http/InteranlSoledHttpClient';
import { GetMeliProductByMlaRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/get-by-mla/GetMeliProductByMlaRepository';
import { PostMeliProductRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/insert/PostMeliProductRepository';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { UpdateFravegaPriceRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRepository';
import { UpdateFravegaStatusRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-status/UpdateFravegaStatusRepository';
import { UpdateFravegaStockRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRepository';
import { UpdatePriceRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-price/UpdatePriceRepository';
import { UpdateStatusProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-status/UpdateStatusProductRepository';
import { UpdateStockRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-stock/UpdateStockRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';
import { ResolveFravegaPrices } from 'src/core/interactors/publisher/fravega/price/ResolveFravegaPrices';
import { ResolveOnCityPrices } from 'src/core/interactors/publisher/oncity/price/ResolveOnCityPrices';
import { ProcessMarketplaceChangeAction } from 'src/core/interactors/marketplace-change-actions/ProcessMarketplaceChangeAction';
import { ImportWebHookChanges } from 'src/core/interactors/webhook/importWebHookChanges';

@Module({
  imports: [PublisherQueueModule],
  controllers: [MercadoLibreWebhookController],
  providers: [
    MercadoLibreWebhookService,
    MercadoLibreWebhookQueueService,
    MarketplaceChangeActionsQueueService,
    MercadoLibreWebhookEventsProcessor,
    MarketplaceChangeActionsProcessor,
    ImportWebHookChanges,
    ProcessMarketplaceChangeAction,
    MarketplaceChangeActionRepository,
    MarketplacePublicationRepository,
    GetMeliProductByMlaRepository,
    GetDetailsProductsRepository,
    PostMeliProductRepository,
    UpdatePriceRepository,
    UpdateStockRepository,
    UpdateStatusProductRepository,
    GetOncityProductRepository,
    ResolveFravegaPrices,
    ResolveOnCityPrices,
    UpdateFravegaPriceRepository,
    UpdateFravegaStockRepository,
    UpdateFravegaStatusRepository,
    MeliHttpClient,
    InteranlSoledHttpClient,
    MarketplaceHttpClient,
  ],
})
export class MercadoLibreWebhookModule {}
