import type {
  ListPublisherRunsParams,
  ListPublisherRunsResponse,
  PublisherRunResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherRun';

export interface IGetPublisherRunRepository {
  getByRunId(runId: string): Promise<PublisherRunResponse>;
  list(params?: ListPublisherRunsParams): Promise<ListPublisherRunsResponse>;
}
