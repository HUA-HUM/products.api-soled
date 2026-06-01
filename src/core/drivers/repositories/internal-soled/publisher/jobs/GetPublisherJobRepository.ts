import { Injectable } from '@nestjs/common';
import type { IGetPublisherJobRepository } from 'src/core/adapters/repositories/interal-soled/publisher/jobs/IGetPublisherJobRepository';
import type {
  ListPublisherJobsParams,
  ListPublisherJobsResponse,
  PublisherJobResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherJob';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class GetPublisherJobRepository implements IGetPublisherJobRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async getByJobId(jobId: string): Promise<PublisherJobResponse> {
    return this.httpClient.get<PublisherJobResponse>(
      `/internal/publisher/jobs/${encodeURIComponent(jobId)}`,
    );
  }

  async list(
    params?: ListPublisherJobsParams,
  ): Promise<ListPublisherJobsResponse> {
    return this.httpClient.get<ListPublisherJobsResponse>(
      '/internal/publisher/jobs',
      params,
    );
  }
}
