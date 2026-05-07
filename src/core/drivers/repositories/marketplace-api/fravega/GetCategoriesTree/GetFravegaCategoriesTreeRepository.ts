import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  FravegaCategoryLeaf,
  IGetFravegaCategoriesTreeRepository
} from 'src/core/adapters/repositories/marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';

type CategoriesTreeResponse = {
  fullCategories?: FravegaCategoryLeaf[];
};

type CachedTree = {
  fetchedAt: string;
  categories: FravegaCategoryLeaf[];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class GetFravegaCategoriesTreeRepository implements IGetFravegaCategoriesTreeRepository {
  private readonly cacheFile = join(process.cwd(), '.cache', 'fravega-categories-tree.json');

  constructor(private readonly http: MarketplaceHttpClient) {}

  async getLeafCategories(): Promise<FravegaCategoryLeaf[]> {
    const cached = await this.readCache();

    if (cached) {
      return cached.categories;
    }

    const response = await this.http.get<CategoriesTreeResponse>('/fravega/categoriesTree');
    const categories = response.fullCategories ?? [];

    await this.writeCache({
      fetchedAt: new Date().toISOString(),
      categories
    });

    return categories;
  }

  private async readCache(): Promise<CachedTree | null> {
    try {
      const raw = await readFile(this.cacheFile, 'utf8');
      const cached = JSON.parse(raw) as CachedTree;

      if (!cached.fetchedAt || !Array.isArray(cached.categories)) {
        return null;
      }

      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age > CACHE_TTL_MS) {
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  }

  private async writeCache(cache: CachedTree): Promise<void> {
    await mkdir(join(process.cwd(), '.cache'), { recursive: true });
    await writeFile(this.cacheFile, JSON.stringify(cache), 'utf8');
  }
}
