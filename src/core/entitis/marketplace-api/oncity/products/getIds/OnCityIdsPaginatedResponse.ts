export interface OnCityProductsIdsPaginatedResponse {
  data: Record<string, number[]>;
  range: {
    total: number;
    from: number;
    to: number;
  };
}
