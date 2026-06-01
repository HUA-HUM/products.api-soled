import type {
  ListPublisherJobsParams,
  ListPublisherJobsResponse,
  PublisherJobResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherJob';

export interface IGetPublisherJobRepository {
  getByJobId(jobId: string): Promise<PublisherJobResponse>;
  list(params?: ListPublisherJobsParams): Promise<ListPublisherJobsResponse>;
}
