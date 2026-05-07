export type PostMeliProductCategoryPath = string[];

export type PostMeliProductAttribute = {
  id: string;
  name: string;
  value_name: string | null;
  value_id?: string | null;
  values?: unknown[];
  value_type?: string;
};

export type PostMeliProductPicture = {
  id?: string;
  url: string;
  secure_url?: string;
};

export type PostMeliProductPayload = {
  meli_item_id: string;
  seller_id: string | number;
  sku: string | null;
  title: string;
  description: string;
  condition_type: string;
  status: string;
  permalink: string;
  price: number;
  base_price: number;
  original_price: number | null;
  available_quantity: number;
  sold_quantity: number;
  listing_type_id: string;
  buying_mode: string;
  catalog_listing: boolean;
  category_id: string;
  category_name: string;
  category_path: PostMeliProductCategoryPath;
  domain_id: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  attributes: PostMeliProductAttribute[];
  thumbnail: string | null;
  pictures: PostMeliProductPicture[];
  video_id: string | null;
  logistic_type: string | null;
  shipping_mode: string | null;
  free_shipping: boolean;
  local_pick_up: boolean;
  has_variations: boolean;
  variations: unknown[];
  raw_payload: Record<string, unknown>;
  last_webhook_at: string | null;
  last_seen_at: string | null;
};

export type PostMeliProductsRequest = {
  products: PostMeliProductPayload[];
};

export type PostMeliProductsResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  items?: unknown[];
  errors?: unknown[];
  raw?: unknown;
};
