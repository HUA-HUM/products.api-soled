export type FravegaTreeValueOption = {
  t?: string;
  v: string;
};

export type FravegaTreeAttribute = {
  ID?: string;
  id?: string;
  name: string;
  required?: boolean;
  type?: string;
  valueOptions?: FravegaTreeValueOption[];
};

export type FravegaCategoryLeaf = {
  id: string;
  name: string;
  parentId?: string | null;
  attributes?: FravegaTreeAttribute[];
};

export interface IGetFravegaCategoriesTreeRepository {
  getLeafCategories(): Promise<FravegaCategoryLeaf[]>;
}
