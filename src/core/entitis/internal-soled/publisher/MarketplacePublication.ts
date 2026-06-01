import type { PublisherMarketplace } from './PublisherJob';

export type PublicationStatus =
  | 'draft'
  | 'pending_publish'
  | 'published'
  | 'paused'
  | 'rejected'
  | 'error'
  | 'out_of_sync'
  | 'deleted';

export type PublicationSyncStatus =
  | 'synced'
  | 'pending'
  | 'processing'
  | 'failed';

export type MarketplacePublicationResponse = {
  id: number;
  sku: string;
  marketplace: PublisherMarketplace;
  source?: string;
  meliItemId?: string | null;
  externalProductId?: string | null;
  externalSku?: string | null;
  externalUrl?: string | null;
  publicationStatus: PublicationStatus;
  syncStatus: PublicationSyncStatus;
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  gtin?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryPath?: unknown;
  listPrice?: number | null;
  salePrice?: number | null;
  netPrice?: number | null;
  discountPercentage?: number | null;
  stock?: number | null;
  currency?: string;
  thumbnail?: string | null;
  images?: unknown;
  attributes?: unknown;
  variations?: unknown;
  payload?: unknown;
  lastResponse?: unknown;
};

export type UpsertMarketplacePublicationRequest = Partial<
  Omit<MarketplacePublicationResponse, 'id' | 'sku' | 'marketplace'>
> & {
  source?: string;
  meliItemId?: string | null;
  externalProductId?: string | null;
  externalSku?: string | null;
  externalUrl?: string | null;
  lastJobId?: string | null;
  lastRunId?: string | null;
};

export type UpsertMarketplacePublicationResponse = {
  ok: boolean;
  id: number;
  sku: string;
  marketplace: PublisherMarketplace;
};

export type UpdateMarketplacePublicationStatusRequest = {
  publicationStatus?: PublicationStatus;
  syncStatus?: PublicationSyncStatus;
  lastErrorMessage?: string;
};

export type UpdateMarketplacePublicationPriceRequest = {
  listPrice?: number;
  salePrice?: number;
  netPrice?: number;
  discountPercentage?: number;
  currency?: string;
};

export type UpdateMarketplacePublicationStockRequest = {
  stock: number;
};

export type MarketplacePublicationOkResponse = {
  ok: boolean;
};

export type ListMarketplacePublicationsParams = {
  sku?: string;
  marketplace?: PublisherMarketplace;
  status?: PublicationStatus;
  limit?: number;
  offset?: number;
};

export type ListMarketplacePublicationsResponse = {
  items: MarketplacePublicationResponse[];
};
