import type { PublisherMarketplace } from './PublisherJob';

export type PublisherRunStatus =
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type PublisherRunResponse = {
  runId: string;
  jobId: string;
  sku: string;
  marketplace: PublisherMarketplace;
  status: PublisherRunStatus;
  attempts: number;
  maxAttempts: number;
  message?: string | null;
};

export type ListPublisherRunsParams = {
  status?: PublisherRunStatus;
  limit?: number;
  offset?: number;
};

export type ListPublisherRunsResponse = {
  items: PublisherRunResponse[];
};

export type UpdatePublisherRunStatusRequest = {
  status: PublisherRunStatus;
  message?: string;
  bullmqJobId?: string;
  errorCode?: string;
  errorMessage?: string;
  responseSnapshot?: unknown;
};

export type UpdatePublisherRunStatusResponse = {
  ok: boolean;
  runId: string;
  status: PublisherRunStatus;
};

export type UpdatePublisherRunSnapshotsRequest = {
  sourceProductSnapshot?: unknown;
  payloadSnapshot?: unknown;
  responseSnapshot?: unknown;
};

export type UpdatePublisherRunSnapshotsResponse = {
  ok: boolean;
};

export type RetryPublisherRunResponse = {
  ok: boolean;
  runId: string;
  status: PublisherRunStatus;
};
