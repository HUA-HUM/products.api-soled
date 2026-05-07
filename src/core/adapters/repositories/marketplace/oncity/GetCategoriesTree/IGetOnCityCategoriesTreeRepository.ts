export type OnCityCategoryNode = {
  id: number;
  name: string;
  hasChildren: boolean;
  url: string | null;
  children: OnCityCategoryNode[];
  Title?: string | null;
  MetaTagDescription?: string | null;
};

export type OnCityCategoryLeaf = {
  id: number;
  name: string;
  path: string[];
};

export interface IGetOnCityCategoriesTreeRepository {
  getTree(): Promise<OnCityCategoryNode[]>;
  getLeafCategories(): Promise<OnCityCategoryLeaf[]>;
}
