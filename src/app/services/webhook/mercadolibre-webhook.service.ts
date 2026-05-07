import { Injectable, Logger } from '@nestjs/common';
import { GetDetailsProductsRepository } from 'src/core/drivers/repositories/meli-api/detailsProducts/GetDetailsProductsRepository';
import { UpdateMeliProductFieldRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/update-field/UpdateMeliProductFieldRepository';
import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';

export type MercadoLibreWebhookPayload = Record<string, unknown>;

export type MercadoLibreWebhookResult = {
  ok: true;
  received: true;
  topic: string | null;
  resource: string | null;
  meliItemId: string | null;
  processed: boolean;
  ignoredReason: string | null;
};

@Injectable()
export class MercadoLibreWebhookService {
  private readonly logger = new Logger(MercadoLibreWebhookService.name);
  private readonly PROCESSABLE_TOPICS = new Set(['items', 'items_prices']);

  constructor(
    private readonly getDetailsProducts: GetDetailsProductsRepository,
    private readonly updateMeliProductField: UpdateMeliProductFieldRepository,
  ) {}

  async receive(
    payload: MercadoLibreWebhookPayload,
  ): Promise<MercadoLibreWebhookResult> {
    const topic = this.getStringOrNull(payload.topic);
    const resource = this.getStringOrNull(payload.resource);
    const meliItemId = this.extractMeliItemId(resource);

    this.logger.log(
      `[MELI-WEBHOOK] Received | topic=${topic ?? 'null'} resource=${resource ?? 'null'} meliItemId=${meliItemId ?? 'null'}`,
    );
    this.logger.debug(`[MELI-WEBHOOK] Payload | ${JSON.stringify(payload)}`);

    if (!topic || !this.PROCESSABLE_TOPICS.has(topic)) {
      return this.buildResult(
        topic,
        resource,
        meliItemId,
        false,
        'topic_ignored',
      );
    }

    if (!meliItemId) {
      return this.buildResult(
        topic,
        resource,
        meliItemId,
        false,
        'meli_item_id_not_found',
      );
    }

    await this.updateTrackedFields(meliItemId);

    return this.buildResult(topic, resource, meliItemId, true, null);
  }

  private async updateTrackedFields(meliItemId: string): Promise<void> {
    const product = await this.getDetailsProducts.getByMla(meliItemId);
    const updates = this.buildFieldUpdates(product);

    for (const update of updates) {
      await this.updateMeliProductField.updateField(meliItemId, update);
    }

    this.logger.log(
      `[MELI-WEBHOOK] Internal fields updated | meliItemId=${meliItemId} fields=${updates.map((update) => update.field).join(',')}`,
    );
  }

  private buildFieldUpdates(product: GetDetailsProductsResponse): Array<{
    field: string;
    value: unknown;
  }> {
    return [
      { field: 'price', value: product.price },
      { field: 'base_price', value: product.base_price },
      { field: 'original_price', value: product.original_price },
      { field: 'stock', value: product.stock },
      { field: 'available_quantity', value: product.available_quantity },
      { field: 'status', value: product.status },
    ];
  }

  private buildResult(
    topic: string | null,
    resource: string | null,
    meliItemId: string | null,
    processed: boolean,
    ignoredReason: string | null,
  ): MercadoLibreWebhookResult {
    return {
      ok: true,
      received: true,
      topic,
      resource,
      meliItemId,
      processed,
      ignoredReason,
    };
  }

  private extractMeliItemId(resource: string | null): string | null {
    if (!resource) {
      return null;
    }

    const match = resource.match(/(?<meliItemId>MLA\d+)/i);
    return match?.groups?.meliItemId ?? null;
  }

  private getStringOrNull(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
