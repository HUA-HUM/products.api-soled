import { Injectable } from '@nestjs/common';
import type { IUpdatePublisherRunRepository } from 'src/core/adapters/repositories/interal-soled/publisher/runs/IUpdatePublisherRunRepository';
import type {
  RetryPublisherRunResponse,
  UpdatePublisherRunSnapshotsRequest,
  UpdatePublisherRunSnapshotsResponse,
  UpdatePublisherRunStatusRequest,
  UpdatePublisherRunStatusResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherRun';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class UpdatePublisherRunRepository implements IUpdatePublisherRunRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async updateStatus(
    runId: string,
    payload: UpdatePublisherRunStatusRequest,
  ): Promise<UpdatePublisherRunStatusResponse> {
    return this.httpClient.patch<UpdatePublisherRunStatusResponse>(
      `/internal/publisher/runs/${encodeURIComponent(runId)}/status`,
      payload,
    );
  }

  async updateSnapshots(
    runId: string,
    payload: UpdatePublisherRunSnapshotsRequest,
  ): Promise<UpdatePublisherRunSnapshotsResponse> {
    return this.httpClient.patch<UpdatePublisherRunSnapshotsResponse>(
      `/internal/publisher/runs/${encodeURIComponent(runId)}/snapshots`,
      payload,
    );
  }

  async retry(runId: string): Promise<RetryPublisherRunResponse> {
    return this.httpClient.post<RetryPublisherRunResponse>(
      `/internal/publisher/runs/${encodeURIComponent(runId)}/retry`,
      {},
    );
  }
}
