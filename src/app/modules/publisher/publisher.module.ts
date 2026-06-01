import { Module } from '@nestjs/common';
import { PublisherController } from 'src/app/controllers/publisher/PublisherController';
import { PublisherQueueModule } from 'src/app/modules/publisher-queue/publisher-queue.module';
import { PublisherRunsProcessor } from 'src/app/processors/publisher/PublisherRunsProcessor';
import { PublisherService } from 'src/app/services/publisher/publisher.service';
import { InteranlSoledHttpClient } from 'src/core/drivers/repositories/internal-soled/http/InteranlSoledHttpClient';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetMeliProductBySkuRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/get-by-sku/GetMeliProductBySkuRepository';
import { CreatePublisherJobRepository } from 'src/core/drivers/repositories/internal-soled/publisher/jobs/CreatePublisherJobRepository';
import { GetPublisherJobRepository } from 'src/core/drivers/repositories/internal-soled/publisher/jobs/GetPublisherJobRepository';
import { GetPublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/GetPublisherRunRepository';
import { UpdatePublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/UpdatePublisherRunRepository';
import { ProcessMarketplaceImagesRepository } from 'src/core/drivers/repositories/image-market/ProcessMarketplaceImagesRepository';
import { CreateFravegaProductsRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/CreateProducts/CreateFravegaProductsRepository';
import { GetFravegaBrandIdRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/GetBrandId/GetFravegaBrandIdRepository';
import { GetFravegaCategoriesTreeRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/GetCategoriesTree/GetFravegaCategoriesTreeRepository';
import { GetFravegaProductsRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/get/GetFravegaProductsRepository';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { GetOnCityCategoriesTreeRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/GetCategoriesTree/GetOnCityCategoriesTreeRepository';
import { GetOnCityBrandsRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/GetBrand/GetOnCityBrandsRepository';
import { CreateOnCityProductsRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/createProducts/CreateOnCityProductsRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';
import { UpdatePriceRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-price/UpdatePriceRepository';
import { UpdateStockRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-stock/UpdateStockRepository';
import { MatchFravegaCategoryRepository } from 'src/core/drivers/repositories/openAi/MatchFravegaCategoryRepository';
import { MatchOnCityCategoryRepository } from 'src/core/drivers/repositories/openAi/MatchOnCityCategoryRepository';
import { OpenAIAttributesExtractor } from 'src/core/drivers/repositories/openAi/OpenAIAttributesExtractor';
import { SyncMarketplacePublicationsCatalog } from 'src/core/interactors/import-marketplaces/SyncMarketplacePublicationsCatalog';
import { ResolveFravegaAttributes } from 'src/core/interactors/publisher/fravega/atributtes/ResolveFravegaAttributes';
import { ResolveFravegaBrand } from 'src/core/interactors/publisher/fravega/brand/ResolveFravegaBrand';
import { ResolveFravegaCategory } from 'src/core/interactors/publisher/fravega/category/ResolveFravegaCategory';
import { BuildFravegaPayload } from 'src/core/interactors/publisher/fravega/payload/BuildFravegaPayload';
import { ResolveFravegaPrices } from 'src/core/interactors/publisher/fravega/price/ResolveFravegaPrices';
import { PublishFravegaProduct } from 'src/core/interactors/publisher/fravega/PublishFravegaProduct';
import { ResolveOnCityBrand } from 'src/core/interactors/publisher/oncity/brand/ResolveOnCityBrand';
import { ResolveOnCityCategory } from 'src/core/interactors/publisher/oncity/category/ResolveOnCityCategory';
import { BuildOnCityPayload } from 'src/core/interactors/publisher/oncity/payload/BuildOnCityPayload';
import { ResolveOnCityPrices } from 'src/core/interactors/publisher/oncity/price/ResolveOnCityPrices';
import { PublishOncityProduct } from 'src/core/interactors/publisher/oncity/PublishOncityProduct';
import { ProcessPublisherRun } from 'src/core/interactors/publisher/publication_run/worker/ProcessPublisherRun';
import { ResolveMeliPackageDimensions } from 'src/core/interactors/publisher/shared/ResolveMeliPackageDimensions';

@Module({
  imports: [PublisherQueueModule],
  controllers: [PublisherController],
  providers: [
    PublisherService,
    PublisherRunsProcessor,
    CreatePublisherJobRepository,
    GetPublisherJobRepository,
    GetPublisherRunRepository,
    UpdatePublisherRunRepository,
    SyncMarketplacePublicationsCatalog,
    ProcessPublisherRun,
    ResolveMeliPackageDimensions,
    PublishOncityProduct,
    ResolveOnCityCategory,
    ResolveOnCityBrand,
    ResolveOnCityPrices,
    BuildOnCityPayload,
    PublishFravegaProduct,
    ResolveFravegaBrand,
    ResolveFravegaCategory,
    ResolveFravegaAttributes,
    ResolveFravegaPrices,
    BuildFravegaPayload,
    {
      provide: 'ICreateOnCityProductsRepository',
      useClass: CreateOnCityProductsRepository,
    },
    {
      provide: 'IUpdateOnCityPriceRepository',
      useClass: UpdatePriceRepository,
    },
    {
      provide: 'IUpdateOnCityStockRepository',
      useClass: UpdateStockRepository,
    },
    {
      provide: 'IGetOnCityBrandsRepository',
      useClass: GetOnCityBrandsRepository,
    },
    {
      provide: 'IGetOnCityCategoriesTreeRepository',
      useClass: GetOnCityCategoriesTreeRepository,
    },
    {
      provide: 'IMatchOnCityCategoryRepository',
      useClass: MatchOnCityCategoryRepository,
    },
    {
      provide: 'IGetFravegaBrandIdRepository',
      useClass: GetFravegaBrandIdRepository,
    },
    {
      provide: 'ICreateFravegaProductsRepository',
      useClass: CreateFravegaProductsRepository,
    },
    {
      provide: 'IGetFravegaCategoriesTreeRepository',
      useClass: GetFravegaCategoriesTreeRepository,
    },
    {
      provide: 'IMatchFravegaCategoryRepository',
      useClass: MatchFravegaCategoryRepository,
    },
    {
      provide: 'IOpenAIAttributesExtractor',
      useClass: OpenAIAttributesExtractor,
    },
    {
      provide: 'IProcessMarketplaceImagesRepository',
      useClass: ProcessMarketplaceImagesRepository,
    },
    GetMeliProductBySkuRepository,
    GetOncityProductRepository,
    GetFravegaProductsRepository,
    MarketplacePublicationRepository,
    InteranlSoledHttpClient,
    MarketplaceHttpClient,
  ],
})
export class PublisherModule {}
