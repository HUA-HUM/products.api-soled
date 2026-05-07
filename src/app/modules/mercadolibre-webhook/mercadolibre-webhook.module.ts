import { Module } from '@nestjs/common';
import { MercadoLibreWebhookController } from 'src/app/controllers/webhook/mercadolibre-webhook.controller';
import { MercadoLibreWebhookService } from 'src/app/services/webhook/mercadolibre-webhook.service';
import { GetDetailsProductsRepository } from 'src/core/drivers/repositories/meli-api/detailsProducts/GetDetailsProductsRepository';
import { MeliHttpClient } from 'src/core/drivers/repositories/meli-api/http/MeliHttpClient';
import { InteranlSoledHttpClient } from 'src/core/drivers/repositories/internal-soled/http/InteranlSoledHttpClient';
import { PostMeliProductRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/insert/PostMeliProductRepository';
import { ImportWebHookChanges } from 'src/core/interactors/webhook/importWebHookChanges';

@Module({
  controllers: [MercadoLibreWebhookController],
  providers: [
    MercadoLibreWebhookService,
    ImportWebHookChanges,
    GetDetailsProductsRepository,
    PostMeliProductRepository,
    MeliHttpClient,
    InteranlSoledHttpClient,
  ],
})
export class MercadoLibreWebhookModule {}
