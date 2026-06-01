import { Injectable, Logger } from '@nestjs/common';
import { PublisherQueueService } from 'src/app/services/publisher-queue/publisher-queue.service';
import { CreatePublisherJobRepository } from 'src/core/drivers/repositories/internal-soled/publisher/jobs/CreatePublisherJobRepository';
import { GetPublisherJobRepository } from 'src/core/drivers/repositories/internal-soled/publisher/jobs/GetPublisherJobRepository';
import { UpdatePublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/UpdatePublisherRunRepository';
import {
  SyncMarketplacePublicationsCatalog,
  SyncMarketplacePublicationsCatalogInput,
  SyncMarketplacePublicationsCatalogSummary,
} from 'src/core/interactors/import-marketplaces/SyncMarketplacePublicationsCatalog';
import type {
  CreatePublisherJobRequest,
  CreatePublisherJobResponse,
  ListPublisherJobsParams,
  ListPublisherJobsResponse,
  PublisherJobResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherJob';
import type { RetryPublisherRunResponse } from 'src/core/entitis/internal-soled/publisher/PublisherRun';

@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);

  constructor(
    private readonly createPublisherJob: CreatePublisherJobRepository,
    private readonly getPublisherJob: GetPublisherJobRepository,
    private readonly updatePublisherRun: UpdatePublisherRunRepository,
    private readonly publisherQueue: PublisherQueueService,
    private readonly syncMarketplacePublicationsCatalog: SyncMarketplacePublicationsCatalog,
  ) {}

  async createJob(
    payload: CreatePublisherJobRequest,
  ): Promise<CreatePublisherJobResponse> {
    const job = await this.createPublisherJob.create(payload);
    const enqueuedRuns = await this.publisherQueue.enqueueRuns(job.items);

    void this.persistBullmqJobIds(enqueuedRuns);

    return job;
  }

  private async persistBullmqJobIds(
    enqueuedRuns: Array<{ runId: string; bullmqJobId: string }>,
  ): Promise<void> {
    await Promise.allSettled(
      enqueuedRuns.map((run) =>
        this.updatePublisherRun.updateStatus(run.runId, {
          status: 'queued',
          bullmqJobId: run.bullmqJobId,
        }),
      ),
    ).then((results) => {
      const rejected = results.filter((result) => result.status === 'rejected');

      if (rejected.length) {
        this.logger.warn(
          `[PUBLISHER] Could not persist BullMQ job ids | failed=${rejected.length}`,
        );
      }
    });
  }

  async getJob(jobId: string): Promise<PublisherJobResponse> {
    return this.getPublisherJob.getByJobId(jobId);
  }

  async listJobs(
    params?: ListPublisherJobsParams,
  ): Promise<ListPublisherJobsResponse> {
    return this.getPublisherJob.list(params);
  }

  async retryRun(runId: string): Promise<RetryPublisherRunResponse> {
    return this.updatePublisherRun.retry(runId);
  }

  async syncMarketplacePublications(
    input: SyncMarketplacePublicationsCatalogInput,
  ): Promise<SyncMarketplacePublicationsCatalogSummary> {
    return this.syncMarketplacePublicationsCatalog.execute(input);
  }
}
