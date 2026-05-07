import { FravegaProduct } from './FravegaProduct';

export interface FravegaProductsPaginatedResponse {
  items: FravegaProduct[];
  total: number;
  limit: number;
  offset: number;
  count: number;
  hasNext: boolean;
  nextOffset: number | null;
}
