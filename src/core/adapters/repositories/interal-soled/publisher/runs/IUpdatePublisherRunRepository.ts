import type {
  RetryPublisherRunResponse,
  UpdatePublisherRunSnapshotsRequest,
  UpdatePublisherRunSnapshotsResponse,
  UpdatePublisherRunStatusRequest,
  UpdatePublisherRunStatusResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherRun';

export interface IUpdatePublisherRunRepository {
  updateStatus(
    runId: string,
    payload: UpdatePublisherRunStatusRequest,
  ): Promise<UpdatePublisherRunStatusResponse>;

  updateSnapshots(
    runId: string,
    payload: UpdatePublisherRunSnapshotsRequest,
  ): Promise<UpdatePublisherRunSnapshotsResponse>;

  retry(runId: string): Promise<RetryPublisherRunResponse>;
}
