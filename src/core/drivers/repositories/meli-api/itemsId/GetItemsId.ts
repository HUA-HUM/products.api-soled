import { Injectable } from '@nestjs/common';
import type { IGetItemsIdRepository } from 'src/core/adapters/repositories/meli-api/itemsId/IGetItemsIdRepository';
import type {
  GetAllItemsIdParams,
  GetAllItemsIdResponse,
  GetItemsIdParams,
  GetItemsIdResponse,
} from 'src/core/entitis/meli-api/itemsId/GetItemsIdResponse';
import { MeliHttpClient } from '../http/MeliHttpClient';

@Injectable()
export class GetItemsId implements IGetItemsIdRepository {
  constructor(private readonly httpClient: MeliHttpClient) {}

  async getItems(params: GetItemsIdParams = {}): Promise<GetItemsIdResponse> {
    return this.httpClient.get<GetItemsIdResponse>('/mercadolibre/products', {
      status: params.status ?? 'active',
      useScan: params.useScan ?? true,
      scrollId: params.scrollId,
      limit: params.limit,
      offset: params.offset,
    });
  }

  async getAllItems(
    params: GetAllItemsIdParams = {},
  ): Promise<GetAllItemsIdResponse> {
    const items: string[] = [];
    let scrollId = params.scrollId;
    let sellerId = '';
    let pages = 0;
    let total = 0;
    let hasNext = true;

    while (hasNext) {
      const page = await this.getItems({
        status: params.status,
        useScan: params.useScan,
        scrollId,
        limit: params.limit,
        offset: params.offset,
      });

      pages += 1;
      sellerId = page.seller_id;
      total = page.pagination.total;
      scrollId = page.scroll_id ?? undefined;
      hasNext = page.pagination.has_next === true && Boolean(scrollId);
      items.push(...page.items);

      if (params.maxPages && pages >= params.maxPages) {
        break;
      }
    }

    return {
      seller_id: sellerId,
      items,
      last_scroll_id: scrollId ?? null,
      pages,
      total,
      has_next: hasNext,
    };
  }
}
