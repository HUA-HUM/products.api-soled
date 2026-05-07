export type OnCityCategoryTreeNodeResponse = {
  id: number;
  name: string;
  hasChildren: boolean;
  url: string | null;
  children: OnCityCategoryTreeNodeResponse[];
  Title?: string | null;
  MetaTagDescription?: string | null;
};

export type GetOnCityCategoriesTreeResponse = OnCityCategoryTreeNodeResponse[];
