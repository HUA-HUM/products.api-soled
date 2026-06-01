export type PublisherMarketplace = string;

export type PublisherJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export type CreatePublisherJobRequest = {
  source: string;
  skus: string[];
  marketplaces: PublisherMarketplace[];
  requestedBy?: {
    odooUserId?: number;
    name?: string;
    email?: string;
  };
  options?: {
    useAiEnrichment?: boolean;
    publishMode?: string;
    forceRepublish?: boolean;
  };
  idempotencyKey?: string;
};

export type PublisherJobItem = {
  runId?: string;
  run_id?: string;
  sku: string;
  marketplace: PublisherMarketplace;
  status: string;
  message?: string | null;
};

export type CreatePublisherJobResponse = {
  jobId: string;
  status: PublisherJobStatus;
  totalItems: number;
  items: PublisherJobItem[];
};

export type PublisherJobResponse = {
  jobId: string;
  status: PublisherJobStatus;
  progress?: number;
  totalItems: number;
  doneItems: number;
  errorItems: number;
  items: PublisherJobItem[];
};

export type ListPublisherJobsParams = {
  status?: PublisherJobStatus;
  limit?: number;
  offset?: number;
};

export type ListPublisherJobsResponse = {
  items: Array<{
    jobId: string;
    status: PublisherJobStatus;
    totalItems: number;
    doneItems: number;
    errorItems: number;
    createdAt?: string;
  }>;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
};
