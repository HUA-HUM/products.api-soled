import { Module } from '@nestjs/common';
import { MercadoLibreWebhookController } from 'src/app/controllers/webhook/mercadolibre-webhook.controller';
import { MercadoLibreWebhookService } from 'src/app/services/webhook/mercadolibre-webhook.service';

@Module({
  controllers: [MercadoLibreWebhookController],
  providers: [MercadoLibreWebhookService],
})
export class MercadoLibreWebhookModule {}
