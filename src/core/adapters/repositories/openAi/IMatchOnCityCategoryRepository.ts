import { OnCityCategoryLeaf } from '../marketplace/oncity/GetCategoriesTree/IGetOnCityCategoriesTreeRepository';

export interface IMatchOnCityCategoryRepository {
  match(params: {
    title: string;
    description?: string;
    categoryPath?: string;
    candidates: OnCityCategoryLeaf[];
  }): Promise<string | null>;
}
