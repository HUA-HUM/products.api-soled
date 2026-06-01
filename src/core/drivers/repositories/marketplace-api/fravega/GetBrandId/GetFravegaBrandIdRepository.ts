import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { IGetFravegaBrandIdRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetBrandId/IGetFravegaBrandIdRepository';
import type {
  FravegaBrand,
  GetFravegaBrandsResponse,
} from 'src/core/entitis/marketplace-api/fravega/GetBrandId/GetFravegaBrandResponse';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';

type CachedBrands = {
  fetchedAt: string;
  brands: FravegaBrand[];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetFravegaBrandIdRepository implements IGetFravegaBrandIdRepository {
  private readonly cacheFile = join(
    process.cwd(),
    '.cache',
    'fravega-brands.json',
  );

  constructor(private readonly http: MarketplaceHttpClient) {}

  async getAll(): Promise<FravegaBrand[]> {
    const cached = await this.readCache();

    if (cached) {
      return cached.brands;
    }

    const brands =
      await this.http.get<GetFravegaBrandsResponse>('/fravega/brands');

    await this.writeCache({
      fetchedAt: new Date().toISOString(),
      brands,
    });

    return brands;
  }

  async findByName(name: string): Promise<FravegaBrand | null> {
    if (!name?.trim()) {
      return null;
    }

    const normalized = this.normalize(name);
    const brands = await this.getAll();

    return (
      brands.find((brand) => this.normalize(brand.name) === normalized) ?? null
    );
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
