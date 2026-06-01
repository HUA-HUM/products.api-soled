import { Injectable } from '@nestjs/common';
import type { IGetPublisherRunRepository } from 'src/core/adapters/repositories/interal-soled/publisher/runs/IGetPublisherRunRepository';
import type {
  ListPublisherRunsParams,
  ListPublisherRunsResponse,
  PublisherRunResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherRun';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class GetPublisherRunRepository implements IGetPublisherRunRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async getByRunId(runId: string): Promise<PublisherRunResponse> {
    return this.httpClient.get<PublisherRunResponse>(
      `/internal/publisher/runs/${encodeURIComponent(runId)}`,
    );
  }

  async list(
    params?: ListPublisherRunsParams,
  ): Promise<ListPublisherRunsResponse> {
    return this.httpClient.get<ListPublisherRunsResponse>(
      '/internal/publisher/runs',
      params,
    );
  }
}
