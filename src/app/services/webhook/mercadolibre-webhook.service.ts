import { Injectable, Logger } from '@nestjs/common';
import { MercadoLibreWebhookPayload } from 'src/core/interactors/webhook/importWebHookChanges';
import {
  MercadoLibreWebhookQueueResult,
  MercadoLibreWebhookQueueService,
} from './mercadolibre-webhook-queue.service';

@Injectable()
export class MercadoLibreWebhookService {
  private readonly logger = new Logger(MercadoLibreWebhookService.name);

  constructor(private readonly queueService: MercadoLibreWebhookQueueService) {}

  async receive(
    payload: MercadoLibreWebhookPayload,
  ): Promise<MercadoLibreWebhookQueueResult> {
    this.logger.debug(`[MELI-WEBHOOK] Payload | ${JSON.stringify(payload)}`);

    return this.queueService.enqueue(payload);
  }
}

export type MercadoLibreWebhookResult = MercadoLibreWebhookQueueResult;
export type { MercadoLibreWebhookPayload };
