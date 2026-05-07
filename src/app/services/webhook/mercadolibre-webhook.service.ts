import { Injectable, Logger } from '@nestjs/common';

export type MercadoLibreWebhookPayload = Record<string, unknown>;

export type MercadoLibreWebhookResult = {
  ok: true;
  received: true;
  topic: string | null;
  resource: string | null;
  meliItemId: string | null;
};

@Injectable()
export class MercadoLibreWebhookService {
  private readonly logger = new Logger(MercadoLibreWebhookService.name);

  receive(payload: MercadoLibreWebhookPayload): MercadoLibreWebhookResult {
    const topic = this.getStringOrNull(payload.topic);
    const resource = this.getStringOrNull(payload.resource);
    const meliItemId = this.extractMeliItemId(resource);

    this.logger.log(
      `[MELI-WEBHOOK] Received | topic=${topic ?? 'null'} resource=${resource ?? 'null'} meliItemId=${meliItemId ?? 'null'}`,
    );
    this.logger.debug(`[MELI-WEBHOOK] Payload | ${JSON.stringify(payload)}`);

    return {
      ok: true,
      received: true,
      topic,
      resource,
      meliItemId,
    };
  }

  private extractMeliItemId(resource: string | null): string | null {
    if (!resource) {
      return null;
    }

    const match = resource.match(/\/items\/(?<meliItemId>MLA\d+)/i);
    return match?.groups?.meliItemId ?? null;
  }

  private getStringOrNull(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
