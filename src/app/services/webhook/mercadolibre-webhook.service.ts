import { Injectable, Logger } from '@nestjs/common';
import {
  ImportWebHookChanges,
  ImportWebHookChangesResult,
  MercadoLibreWebhookPayload,
} from 'src/core/interactors/webhook/importWebHookChanges';

@Injectable()
export class MercadoLibreWebhookService {
  private readonly logger = new Logger(MercadoLibreWebhookService.name);

  constructor(private readonly importWebHookChanges: ImportWebHookChanges) {}

  async receive(
    payload: MercadoLibreWebhookPayload,
  ): Promise<ImportWebHookChangesResult> {
    this.logger.debug(`[MELI-WEBHOOK] Payload | ${JSON.stringify(payload)}`);

    return this.importWebHookChanges.execute(payload);
  }
}

export type MercadoLibreWebhookResult = ImportWebHookChangesResult;
export type { MercadoLibreWebhookPayload };
