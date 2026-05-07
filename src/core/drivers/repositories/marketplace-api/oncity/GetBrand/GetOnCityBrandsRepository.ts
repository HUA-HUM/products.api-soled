import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IGetOnCityBrandsRepository } from 'src/core/adapters/repositories/marketplace/oncity/GetBrand/IGetOnCityBrandsRepository';
import {
  GetOnCityBrandsResponse,
  OnCityBrand
} from 'src/core/entitis/marketplace-api/oncity/GetBrand/GetOnCityBrandsResponse';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';

type CachedBrands = {
  fetchedAt: string;
  brands: OnCityBrand[];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 100;

export class GetOnCityBrandsRepository implements IGetOnCityBrandsRepository {
  private readonly cacheFile = join(process.cwd(), '.cache', 'oncity-brands.json');

  constructor(private readonly http: MarketplaceHttpClient) {}

  async getAll(): Promise<OnCityBrand[]> {
    const cached = await this.readCache();

    if (cached) {
      return cached.brands;
    }

    const brands = await this.fetchAllBrands();

    await this.writeCache({
      fetchedAt: new Date().toISOString(),
      brands
    });

    return brands;
  }

  async findByName(name: string): Promise<OnCityBrand | null> {
    if (!name?.trim()) {
      return null;
    }

    const normalized = this.normalize(name);
    const brands = await this.getAll();

    return brands.find(brand => this.normalize(brand.name) === normalized) ?? null;
  }

  private async fetchAllBrands(): Promise<OnCityBrand[]> {
    const brands: OnCityBrand[] = [];
    let offset = 0;

    while (true) {
      const response = await this.http.get<GetOnCityBrandsResponse>('/oncity/brands', {
        limit: DEFAULT_LIMIT,
        offset
      });

      brands.push(...(response.items ?? []));

      if (!response.hasNext || response.nextOffset === null) {
        break;
      }

      offset = response.nextOffset;
    }

    return brands;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private async readCache(): Promise<CachedBrands | null> {
    try {
      const raw = await readFile(this.cacheFile, 'utf8');
      const cached = JSON.parse(raw) as CachedBrands;

      if (!cached.fetchedAt || !Array.isArray(cached.brands)) {
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

  private async writeCache(cache: CachedBrands): Promise<void> {
    await mkdir(join(process.cwd(), '.cache'), { recursive: true });
    await writeFile(this.cacheFile, JSON.stringify(cache), 'utf8');
  }
}
