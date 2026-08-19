import { Injectable } from '@nestjs/common';
import type {
  BulkMarketplaceChangeActionsRequest,
  BulkMarketplaceChangeActionsResponse,
  ListMarketplaceChangeActionsParams,
  ListMarketplaceChangeActionsResponse,
  MarketplaceChangeAction,
  MarketplaceChangeActionOkResponse,
} from 'src/core/entitis/internal-soled/marketplace-change-actions/MarketplaceChangeAction';
import { InteranlSoledHttpClient } from '../http/InteranlSoledHttpClient';

@Injectable()
export class MarketplaceChangeActionRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async bulkCreateOrGet(
    payload: BulkMarketplaceChangeActionsRequest,
  ): Promise<BulkMarketplaceChangeActionsResponse> {
    return this.httpClient.post<BulkMarketplaceChangeActionsResponse>(
      '/internal/marketplace-change-actions/bulk',
      payload,
    );
  }

  async getByActionId(actionId: string): Promise<MarketplaceChangeAction> {
    return this.httpClient.get<MarketplaceChangeAction>(
      `/internal/marketplace-change-actions/${encodeURIComponent(actionId)}`,
    );
  }

  async list(
    params?: ListMarketplaceChangeActionsParams,
  ): Promise<ListMarketplaceChangeActionsResponse> {
    return this.httpClient.get<ListMarketplaceChangeActionsResponse>(
      '/internal/marketplace-change-actions',
      params,
    );
  }

  async markProcessing(
    actionId: string,
    payload: { attempts: number; bullmqJobId?: string },
  ): Promise<MarketplaceChangeActionOkResponse> {
    return this.httpClient.patch<MarketplaceChangeActionOkResponse>(
      `/internal/marketplace-change-actions/${encodeURIComponent(actionId)}/processing`,
      payload,
    );
  }

  async complete(
    actionId: string,
    payload: { requestSnapshot?: unknown; responseSnapshot?: unknown },
  ): Promise<MarketplaceChangeActionOkResponse> {
    return this.httpClient.patch<MarketplaceChangeActionOkResponse>(
      `/internal/marketplace-change-actions/${encodeURIComponent(actionId)}/complete`,
      payload,
    );
  }

  async fail(
    actionId: string,
    payload: {
      attempts: number;
      errorCode: string;
      errorMessage: string;
      requestSnapshot?: unknown;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionOkResponse> {
    return this.httpClient.patch<MarketplaceChangeActionOkResponse>(
      `/internal/marketplace-change-actions/${encodeURIComponent(actionId)}/fail`,
      payload,
    );
  }

  async skip(
    actionId: string,
    payload: { reason: string; responseSnapshot?: unknown },
  ): Promise<MarketplaceChangeActionOkResponse> {
    return this.httpClient.patch<MarketplaceChangeActionOkResponse>(
      `/internal/marketplace-change-actions/${encodeURIComponent(actionId)}/skip`,
      payload,
    );
  }

  async updateBullmqJobId(
    actionId: string,
    bullmqJobId: string,
  ): Promise<MarketplaceChangeActionOkResponse> {
    return this.httpClient.patch<MarketplaceChangeActionOkResponse>(
      `/internal/marketplace-change-actions/${encodeURIComponent(actionId)}/bullmq-job`,
      { bullmqJobId },
    );
  }
}
