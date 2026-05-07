export type MeliItemsIdPagination = {
  limit: number;
  offset: number;
  total: number;
  has_next: boolean;
};

export type GetItemsIdResponse = {
  seller_id: string;
  items: string[];
  scroll_id: string | null;
  pagination: MeliItemsIdPagination;
};

export type GetItemsIdParams = {
  status?: string;
  useScan?: boolean;
  scrollId?: string;
  limit?: number;
  offset?: number;
};

export type GetAllItemsIdParams = GetItemsIdParams & {
  maxPages?: number;
};

export type GetAllItemsIdResponse = {
  seller_id: string;
  items: string[];
  last_scroll_id: string | null;
  pages: number;
  total: number;
  has_next: boolean;
};
