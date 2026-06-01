import { FravegaProduct } from './FravegaProduct';

export interface FravegaProductsPaginatedResponse {
  items?: FravegaProduct[];
  data?: FravegaProduct[];
  total: number;
  page?: number;
  size?: number;
  limit: number;
  offset: number;
  count: number;
  hasNext?: boolean;
  nextOffset?: number | null;
}
