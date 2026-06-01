import { Inject, Injectable } from '@nestjs/common';
import type {
  FravegaCategoryLeaf,
  IGetFravegaCategoriesTreeRepository,
} from 'src/core/adapters/repositories/marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';
import type { IMatchFravegaCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchFravegaCategoryRepository';

type FravegaCategoryProduct = {
  title?: string;
  description?: string;
  categoryPath?: string | string[];
  category_path?: string | string[];
};

@Injectable()
export class ResolveFravegaCategory {
  constructor(
    @Inject('IGetFravegaCategoriesTreeRepository')
    private readonly categoriesRepository: IGetFravegaCategoriesTreeRepository,

    @Inject('IMatchFravegaCategoryRepository')
    private readonly matchRepository: IMatchFravegaCategoryRepository,
  ) {}

  async execute(product: FravegaCategoryProduct): Promise<string | null> {
    const categoryIds = await this.executeCandidates(product, 1);
    return categoryIds[0] ?? null;
  }

  async executeCandidates(
    product: FravegaCategoryProduct,
    limit = 5,
  ): Promise<string[]> {
    const defaultCategoryId = process.env.FRAVEGA_DEFAULT_CATEGORY_ID?.trim();

    if (defaultCategoryId) {
      return [defaultCategoryId];
    }

    if (!product.title) {
      return [];
    }

    try {
      const categories = await this.categoriesRepository.getLeafCategories();
      const categoryPath = this.normalizeCategoryPath(
        product.categoryPath ?? product.category_path,
      );
      const shortlisted = this.selectCandidates(categories, categoryPath);
      const selectedId = await this.matchRepository.match({
        title: product.title,
        description: product.description,
        categoryPath,
        candidates: shortlisted,
      });

      const orderedIds = [
        ...(selectedId ? [selectedId] : []),
        ...shortlisted
          .map((category) => category.id)
          .filter((id) => id !== selectedId),
      ];

      return orderedIds.slice(0, limit);
    } catch {
      return [];
    }
  }

  private selectCandidates(
    categories: FravegaCategoryLeaf[],
    categoryPath?: string,
  ): FravegaCategoryLeaf[] {
    if (!categoryPath) {
      return categories;
    }

    const pathTokens = this.tokenize(categoryPath);
    const ranked = categories
      .map((category) => ({
        category,
        score: this.tokenize(category.name).reduce((score, token) => {
          return score + (pathTokens.includes(token) ? 1 : 0);
        }, 0),
      }))
      .sort((a, b) => b.score - a.score);

    const filtered = ranked
      .filter((item) => item.score > 0)
      .slice(0, 80)
      .map((item) => item.category);

    return filtered.length ? filtered : categories;
  }

  private tokenize(text: string): string[] {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  private normalizeCategoryPath(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value.join(' > ');
    }

    if (!value) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.join(' > ') : value;
    } catch {
      return value;
    }
  }
}
