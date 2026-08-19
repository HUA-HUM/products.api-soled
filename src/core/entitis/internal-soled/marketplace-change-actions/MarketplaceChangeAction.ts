export type MarketplaceChangeActionMarketplace = 'oncity' | 'fravega';
export type MarketplaceChangeActionType = 'price' | 'stock' | 'status';
export type MarketplaceChangeActionStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type MarketplaceChangeAction = {
  id: number;
  actionId: string;
  dedupeKey: string;
  source: string;
  sku: string;
  meliItemId?: string | null;
  marketplace: MarketplaceChangeActionMarketplace;
  changeType: MarketplaceChangeActionType;
  status: MarketplaceChangeActionStatus;
  oldValue?: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  publicationId?: number | null;
  externalProductId?: string | null;
  externalSku?: string | null;
  attempts: number;
  maxAttempts: number;
  bullmqJobId?: string | null;
  requestSnapshot?: unknown;
  responseSnapshot?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type CreateMarketplaceChangeAction = {
  actionId: string;
  dedupeKey: string;
  source: string;
  sku: string;
  meliItemId?: string | null;
  marketplace: MarketplaceChangeActionMarketplace;
  changeType: MarketplaceChangeActionType;
  oldValue?: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  publicationId?: number | null;
  externalProductId?: string | null;
  externalSku?: string | null;
  maxAttempts?: number;
};

export type BulkMarketplaceChangeActionsRequest = {
  actions: CreateMarketplaceChangeAction[];
};

export type BulkMarketplaceChangeActionsResponse = {
  items: Array<{
    id: number;
    actionId: string;
    dedupeKey: string;
    status: MarketplaceChangeActionStatus;
    created: boolean;
  }>;
};

export type ListMarketplaceChangeActionsParams = {
  sku?: string;
  meliItemId?: string;
  marketplace?: MarketplaceChangeActionMarketplace;
  changeType?: MarketplaceChangeActionType;
  status?: MarketplaceChangeActionStatus;
  source?: string;
  limit?: number;
  offset?: number;
};

export type ListMarketplaceChangeActionsResponse = {
  items: MarketplaceChangeAction[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type MarketplaceChangeActionOkResponse = {
  ok: boolean;
  actionId: string;
  status?: MarketplaceChangeActionStatus;
};
