export type OnCityBrand = {
  id: number;
  name: string;
  active: boolean;
};

export type GetOnCityBrandsResponse = {
  items: OnCityBrand[];
  total: number;
  limit: number;
  offset: number;
  count: number;
  hasNext: boolean;
  nextOffset: number | null;
};
