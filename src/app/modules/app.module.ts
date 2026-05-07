import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MeliImportController } from '../controllers/meli-import/MeliImportController';
import { MercadoLibreWebhookModule } from './mercadolibre-webhook/mercadolibre-webhook.module';
import { ImportAllProdcutsFromMeli } from 'src/core/interactors/import-meli/ImportAllProdcutsFromMeli';
import { GetItemsId } from 'src/core/drivers/repositories/meli-api/itemsId/GetItemsId';
import { GetDetailsProductsRepository } from 'src/core/drivers/repositories/meli-api/detailsProducts/GetDetailsProductsRepository';
import { GetDetailsProductsBulkRepository } from 'src/core/drivers/repositories/meli-api/detailsProductsBulk/GetDetailsProductsBulkRepository';
import { PostMeliProductRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/insert/PostMeliProductRepository';
import { MeliHttpClient } from 'src/core/drivers/repositories/meli-api/http/MeliHttpClient';
import { InteranlSoledHttpClient } from 'src/core/drivers/repositories/internal-soled/http/InteranlSoledHttpClient';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MercadoLibreWebhookModule,
  ],
  controllers: [MeliImportController],
  providers: [
    ImportAllProdcutsFromMeli,
    GetItemsId,
    GetDetailsProductsRepository,
    GetDetailsProductsBulkRepository,
    PostMeliProductRepository,
    MeliHttpClient,
    InteranlSoledHttpClient,
  ],
})
export class AppModule {}
