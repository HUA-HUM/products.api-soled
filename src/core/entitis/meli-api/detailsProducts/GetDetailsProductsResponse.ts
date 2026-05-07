export type MeliCategoryPathItem = {
  id: string;
  name: string;
};

export type MeliAttributeStruct = {
  number?: number;
  unit?: string;
};

export type MeliAttributeValue = {
  id: string | null;
  name: string | null;
  struct: MeliAttributeStruct | null;
};

export type MeliProductAttribute = {
  id: string;
  name: string;
  value_id: string | null;
  value_name: string | null;
  values: MeliAttributeValue[];
  value_type: string;
};

export type GetDetailsProductsResponse = {
  id: string;
  meli_item_id: string;
  seller_id: number;
  sku: string | null;
  categoryId: string;
  category_id: string;
  category_name: string;
  category_path: MeliCategoryPathItem[];
  title: string;
  description: string;
  price: number;
  base_price: number;
  original_price: number | null;
  currency: string;
  stock: number;
  available_quantity: number;
  soldQuantity: number;
  sold_quantity: number;
  status: string;
  condition: string;
  condition_type: string;
  permalink: string;
  thumbnail: string | null;
  pictures: string[];
  sellerSku: string | null;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  attributes: MeliProductAttribute[];
  warranty: string | null;
  listing_type_id: string;
  buying_mode: string;
  catalog_listing: boolean;
  domain_id: string;
  video_id: string | null;
  logistic_type: string | null;
  shipping_mode: string | null;
  freeShipping: boolean;
  free_shipping: boolean;
  local_pick_up: boolean;
  has_variations: boolean;
  variations: unknown[];
  health: number | null;
  lastUpdated: string | null;
  raw_payload: Record<string, unknown>;
  last_webhook_at: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
