import { FravegaCategoryLeaf } from '../marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';

export interface IMatchFravegaCategoryRepository {
  match(params: {
    title: string;
    description?: string;
    categoryPath?: string;
    candidates: FravegaCategoryLeaf[];
  }): Promise<string | null>;
}
