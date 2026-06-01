import type {
  CreatePublisherJobRequest,
  CreatePublisherJobResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherJob';

export interface ICreatePublisherJobRepository {
  create(
    payload: CreatePublisherJobRequest,
  ): Promise<CreatePublisherJobResponse>;
}
