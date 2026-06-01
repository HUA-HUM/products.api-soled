import { Injectable } from '@nestjs/common';
import type { ICreatePublisherJobRepository } from 'src/core/adapters/repositories/interal-soled/publisher/jobs/ICreatePublisherJobRepository';
import type {
  CreatePublisherJobRequest,
  CreatePublisherJobResponse,
} from 'src/core/entitis/internal-soled/publisher/PublisherJob';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class CreatePublisherJobRepository implements ICreatePublisherJobRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async create(
    payload: CreatePublisherJobRequest,
  ): Promise<CreatePublisherJobResponse> {
    return this.httpClient.post<CreatePublisherJobResponse>(
      '/internal/publisher/jobs',
      payload,
    );
  }
}
