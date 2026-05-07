import type {
  GetAllItemsIdParams,
  GetAllItemsIdResponse,
  GetItemsIdParams,
  GetItemsIdResponse,
} from 'src/core/entitis/meli-api/itemsId/GetItemsIdResponse';

export interface IGetItemsIdRepository {
  getItems(params?: GetItemsIdParams): Promise<GetItemsIdResponse>;
  getAllItems(params?: GetAllItemsIdParams): Promise<GetAllItemsIdResponse>;
}
