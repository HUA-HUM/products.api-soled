import { OnCityProducts } from './OnCityProducts';

export interface OnCityProductsPaginatedResponse {
  items: OnCityProducts[];
  total: number;
  limit: number;
  offset: number;
  count: number;
  hasNext: boolean;
  nextOffset: number;
}
