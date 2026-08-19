import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { MARKETPLACE_CHANGE_ACTIONS_QUEUE } from 'src/app/modules/publisher-queue/publisher-queue.constants';
import { MarketplaceChangeActionsQueueService } from 'src/app/services/marketplace-change-actions/marketplace-change-actions-queue.service';
import type { MarketplaceChangeActionJobData } from 'src/app/services/marketplace-change-actions/marketplace-change-actions-queue.service';
import { MarketplaceChangeActionRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-change-actions/MarketplaceChangeActionRepository';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import type {
  CreateMarketplaceChangeAction,
  MarketplaceChangeAction,
} from 'src/core/entitis/internal-soled/marketplace-change-actions/MarketplaceChangeAction';
import { ProcessMarketplaceChangeAction } from 'src/core/interactors/marketplace-change-actions/ProcessMarketplaceChangeAction';

const AUTO_PAUSE_MAX_ATTEMPTS = 2;

@Processor(MARKETPLACE_CHANGE_ACTIONS_QUEUE, {
  concurrency: 3,
  lockDuration: 5 * 60 * 1000,
  lockRenewTime: 30 * 1000,
  stalledInterval: 60 * 1000,
  maxStalledCount: 3,
})
export class MarketplaceChangeActionsProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketplaceChangeActionsProcessor.name);

  constructor(
    private readonly actionsRepository: MarketplaceChangeActionRepository,
    private readonly processAction: ProcessMarketplaceChangeAction,
    private readonly marketplacePublications: MarketplacePublicationRepository,
    private readonly changeActionsQueue: MarketplaceChangeActionsQueueService,
  ) {
    super();
  }

  async process(job: Job<MarketplaceChangeActionJobData>): Promise<void> {
    const actionId = job.data.actionId;
    const attempts = job.attemptsMade + 1;

    this.logger.log(
      `[MARKETPLACE-CHANGE] Processing | actionId=${actionId} attempt=${attempts}`,
    );

    const action = await this.actionsRepository.getByActionId(actionId);

    await this.actionsRepository.markProcessing(actionId, {
      attempts,
      bullmqJobId: String(job.id),
    });

    try {
      const result = await this.processAction.execute(action);

      if (result.status === 'skipped') {
        await this.actionsRepository.skip(actionId, {
          reason: result.reason ?? 'SKIPPED',
          responseSnapshot: result.responseSnapshot,
        });
        return;
      }

      await this.actionsRepository.complete(actionId, {
        requestSnapshot: result.requestSnapshot,
        responseSnapshot: result.responseSnapshot,
      });
    } catch (error: any) {
      const isLastAttempt = attempts >= (job.opts.attempts ?? 1);

      if (!isLastAttempt) {
        throw error;
      }

      const errorCode = this.getErrorCode(error);
      const errorMessage = error?.message ?? String(error);

      await this.actionsRepository.fail(actionId, {
        attempts,
        errorCode,
        errorMessage,
        requestSnapshot: error?.requestSnapshot,
        responseSnapshot: error?.body ?? error?.response?.data ?? error,
      });

      this.logger.error(
        `[MARKETPLACE-CHANGE-ALERT] Action failed permanently after ${attempts} attempts | actionId=${actionId} sku=${action.sku} marketplace=${action.marketplace} changeType=${action.changeType} errorCode=${errorCode} errorMessage=${errorMessage}`,
      );

      await this.markPublicationOutOfSync(action.marketplace, action.sku);
      await this.autoPauseAfterExhaustedRetries(
        action,
        errorCode,
        errorMessage,
      );
    }
  }

  private async markPublicationOutOfSync(
    marketplace: string,
    sku: string,
  ): Promise<void> {
    try {
      await this.marketplacePublications.updateStatus(marketplace, sku, {
        publicationStatus: 'error',
        syncStatus: 'failed',
      });
    } catch (error: any) {
      this.logger.warn(
        `[MARKETPLACE-CHANGE] Failed to flag publication as out of sync | sku=${sku} marketplace=${marketplace} error=${error?.message ?? String(error)}`,
      );
    }
  }

  private async autoPauseAfterExhaustedRetries(
    action: MarketplaceChangeAction,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    if (action.changeType === 'status') {
      // Ya era un intento de cambiar el estado (posiblemente ya una pausa
      // automática anterior); reintentar en bucle no soluciona nada, así que
      // se deja para intervención manual.
      return;
    }

    const pauseAction: CreateMarketplaceChangeAction = {
      actionId: `chg_${Date.now()}_${randomUUID().slice(0, 8)}`,
      dedupeKey: [
        'auto_pause_on_failure',
        action.sku,
        action.marketplace,
        action.actionId,
      ].join(':'),
      source: 'auto_pause_on_failure',
      sku: action.sku,
      meliItemId: action.meliItemId,
      marketplace: action.marketplace,
      changeType: 'status',
      oldValue: { reason: 'auto_pause_after_max_retries' },
      newValue: {
        status: 'paused',
        causedByActionId: action.actionId,
        causedByChangeType: action.changeType,
        errorCode,
        errorMessage,
      },
      publicationId: action.publicationId,
      externalProductId: action.externalProductId,
      externalSku: action.externalSku,
      maxAttempts: AUTO_PAUSE_MAX_ATTEMPTS,
    };

    try {
      const created = await this.actionsRepository.bulkCreateOrGet({
        actions: [pauseAction],
      });
      const queuedItem = created.items.find((item) => item.status === 'queued');

      if (!queuedItem) {
        return;
      }

      const enqueued = await this.changeActionsQueue.enqueue([
        { actionId: queuedItem.actionId, maxAttempts: AUTO_PAUSE_MAX_ATTEMPTS },
      ]);

      await Promise.allSettled(
        enqueued.map((item) =>
          this.actionsRepository.updateBullmqJobId(
            item.actionId,
            item.bullmqJobId,
          ),
        ),
      );

      this.logger.warn(
        `[MARKETPLACE-CHANGE-ALERT] Auto-pause queued after exhausted retries | sku=${action.sku} marketplace=${action.marketplace} pauseActionId=${pauseAction.actionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[MARKETPLACE-CHANGE-ALERT] Failed to queue auto-pause | sku=${action.sku} marketplace=${action.marketplace} error=${error?.message ?? String(error)}`,
      );
    }
  }

  private getErrorCode(error: any): string {
    if (typeof error?.code === 'string') {
      return error.code;
    }

    if (typeof error?.name === 'string') {
      return error.name;
    }

    return 'MARKETPLACE_CHANGE_ACTION_FAILED';
  }
}
