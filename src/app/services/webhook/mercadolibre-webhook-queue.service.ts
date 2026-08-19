import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  MELI_WEBHOOK_EVENT_JOB_NAME,
  MELI_WEBHOOK_EVENTS_QUEUE,
} from 'src/app/modules/publisher-queue/publisher-queue.constants';
import type { MercadoLibreWebhookPayload } from 'src/core/interactors/webhook/importWebHookChanges';

export type MercadoLibreWebhookJobData = {
  payload: MercadoLibreWebhookPayload;
  topic: string | null;
  resource: string | null;
  meliItemId: string | null;
  receivedAt: string;
};

export type MercadoLibreWebhookQueueResult = {
  ok: true;
  received: true;
  queued: boolean;
  topic: string | null;
  resource: string | null;
  meliItemId: string | null;
  bullmqJobId: string | null;
  ignoredReason: string | null;
};

@Injectable()
export class MercadoLibreWebhookQueueService {
  private readonly logger = new Logger(MercadoLibreWebhookQueueService.name);
  private readonly processableTopics = new Set(['items', 'items_prices']);

  constructor(
    @InjectQueue(MELI_WEBHOOK_EVENTS_QUEUE)
    private readonly queue: Queue<MercadoLibreWebhookJobData>,
  ) {}

  async enqueue(
    payload: MercadoLibreWebhookPayload,
  ): Promise<MercadoLibreWebhookQueueResult> {
    const topic = this.getStringOrNull(payload.topic);
    const resource = this.getStringOrNull(payload.resource);
    const meliItemId = this.extractMeliItemId(resource);

    if (!topic || !this.processableTopics.has(topic)) {
      return this.buildResult(
        topic,
        resource,
        meliItemId,
        false,
        null,
        'topic_ignored',
      );
    }

    if (!meliItemId) {
      return this.buildResult(
        topic,
        resource,
        meliItemId,
        false,
        null,
        'meli_item_id_not_found',
      );
    }

    const job = await this.queue.add(
      MELI_WEBHOOK_EVENT_JOB_NAME,
      {
        payload,
        topic,
        resource,
        meliItemId,
        receivedAt: new Date().toISOString(),
      },
      {
        jobId: this.buildJobId(payload, topic, meliItemId),
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: 5000,
        removeOnFail: 10000,
      },
    );

    this.logger.log(
      `[MELI-WEBHOOK-QUEUE] Event enqueued | topic=${topic} meliItemId=${meliItemId} jobId=${job.id}`,
    );

    return this.buildResult(topic, resource, meliItemId, true, String(job.id));
  }

  private buildJobId(
    payload: MercadoLibreWebhookPayload,
    topic: string,
    meliItemId: string,
  ): string {
    const notificationId = this.getStringOrNull(payload._id);

    if (notificationId) {
      return `meli-webhook_${notificationId}`;
    }

    const sent = this.getStringOrNull(payload.sent) ?? Date.now();
    return `meli-webhook_${topic}_${meliItemId}_${sent}`;
  }

  private buildResult(
    topic: string | null,
    resource: string | null,
    meliItemId: string | null,
    queued: boolean,
    bullmqJobId: string | null = null,
    ignoredReason: string | null = null,
  ): MercadoLibreWebhookQueueResult {
    return {
      ok: true,
      received: true,
      queued,
      topic,
      resource,
      meliItemId,
      bullmqJobId,
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
