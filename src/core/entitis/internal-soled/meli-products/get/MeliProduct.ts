export type InternalMeliProductAttribute = {
  id: string;
  name: string;
  value_name: string | null;
};

export type InternalMeliProductPicture = {
  id?: string;
  url: string;
  secure_url?: string;
};

export type InternalMeliProduct = {
  id: string;
  meli_item_id: string;
  seller_id: string;
  sku: string | null;
  title: string;
  description: string;
  condition_type: string;
  status: string;
  permalink: string;
  price: string | number;
  base_price: string | number;
  original_price: string | number | null;
  available_quantity: number;
  sold_quantity: number;
  listing_type_id: string;
  buying_mode: string;
  catalog_listing: boolean | number;
  category_id: string;
  category_name: string;
  category_path: string[] | string;
  domain_id: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  attributes: InternalMeliProductAttribute[];
  thumbnail: string | null;
  pictures: InternalMeliProductPicture[];
  video_id: string | null;
  logistic_type: string | null;
  shipping_mode: string | null;
  free_shipping: boolean | number;
  local_pick_up: boolean | number;
  has_variations: boolean | number;
  variations: unknown[];
  raw_payload: Record<string, unknown>;
  last_webhook_at: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
