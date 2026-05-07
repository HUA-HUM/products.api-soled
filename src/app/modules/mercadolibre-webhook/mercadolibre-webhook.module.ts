import { Module } from '@nestjs/common';
import { MercadoLibreWebhookController } from 'src/app/controllers/webhook/mercadolibre-webhook.controller';
import { MercadoLibreWebhookService } from 'src/app/services/webhook/mercadolibre-webhook.service';
import { GetDetailsProductsRepository } from 'src/core/drivers/repositories/meli-api/detailsProducts/GetDetailsProductsRepository';
import { MeliHttpClient } from 'src/core/drivers/repositories/meli-api/http/MeliHttpClient';
import { InteranlSoledHttpClient } from 'src/core/drivers/repositories/internal-soled/http/InteranlSoledHttpClient';
import { UpdateMeliProductFieldRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/update-field/UpdateMeliProductFieldRepository';

@Module({
  controllers: [MercadoLibreWebhookController],
  providers: [
    MercadoLibreWebhookService,
    GetDetailsProductsRepository,
    UpdateMeliProductFieldRepository,
    MeliHttpClient,
    InteranlSoledHttpClient,
  ],
})
export class MercadoLibreWebhookModule {}
