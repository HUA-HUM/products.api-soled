import { Injectable } from '@nestjs/common';
import type {
  CreateProcessRunRequest,
  FinishProcessRunRequest,
  ProcessRunResponse,
} from 'src/core/entitis/internal-soled/process-runs/ProcessRun';
import { InteranlSoledHttpClient } from '../http/InteranlSoledHttpClient';

@Injectable()
export class ProcessRunsRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async create(input: CreateProcessRunRequest): Promise<ProcessRunResponse> {
    return this.httpClient.post<ProcessRunResponse>(
      '/internal/process-runs',
      input,
    );
  }

  async finish(
    id: number,
    input: FinishProcessRunRequest,
  ): Promise<ProcessRunResponse> {
    return this.httpClient.patch<ProcessRunResponse>(
      `/internal/process-runs/${id}`,
      input,
    );
  }
}
