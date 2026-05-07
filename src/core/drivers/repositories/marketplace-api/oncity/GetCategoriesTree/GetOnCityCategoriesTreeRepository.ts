import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  IGetOnCityCategoriesTreeRepository,
  OnCityCategoryLeaf,
  OnCityCategoryNode
} from 'src/core/adapters/repositories/marketplace/oncity/GetCategoriesTree/IGetOnCityCategoriesTreeRepository';
import { GetOnCityCategoriesTreeResponse } from 'src/core/entitis/marketplace-api/oncity/GetCategoriesTree/GetOnCityCategoriesTreeResponse';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';

type CachedTree = {
  fetchedAt: string;
  tree: OnCityCategoryNode[];
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export class GetOnCityCategoriesTreeRepository implements IGetOnCityCategoriesTreeRepository {
  private readonly cacheFile = join(process.cwd(), '.cache', 'oncity-categories-tree.json');

  constructor(private readonly http: MarketplaceHttpClient) {}

  async getTree(): Promise<OnCityCategoryNode[]> {
    const cached = await this.readCache();

    if (cached) {
      return cached.tree;
    }

    const response = await this.http.get<GetOnCityCategoriesTreeResponse>('/oncity/categories/tree');
    const tree = response ?? [];

    await this.writeCache({
      fetchedAt: new Date().toISOString(),
      tree
    });

    return tree;
  }

  async getLeafCategories(): Promise<OnCityCategoryLeaf[]> {
    const tree = await this.getTree();
    return this.flattenLeaves(tree);
  }

  private flattenLeaves(nodes: OnCityCategoryNode[], path: string[] = []): OnCityCategoryLeaf[] {
    const leaves: OnCityCategoryLeaf[] = [];

    for (const node of nodes) {
      const nextPath = [...path, node.name];

      if (!node.children?.length) {
        leaves.push({
          id: node.id,
          name: node.name,
          path: nextPath
        });
        continue;
      }

      leaves.push(...this.flattenLeaves(node.children, nextPath));
    }

    return leaves;
  }

  private async readCache(): Promise<CachedTree | null> {
    try {
      const raw = await readFile(this.cacheFile, 'utf8');
      const cached = JSON.parse(raw) as CachedTree;

      if (!cached.fetchedAt || !Array.isArray(cached.tree)) {
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
