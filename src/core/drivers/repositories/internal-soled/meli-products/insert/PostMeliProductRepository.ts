import { Injectable } from '@nestjs/common';
import type { IPostMeliProductRepository } from 'src/core/adapters/repositories/interal-soled/meli-products/insert/IPostMeliProductRepository';
import type {
  PostMeliProductPayload,
  PostMeliProductsResponse,
} from 'src/core/entitis/internal-soled/meli-products/insert/PostMeliProduct';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class PostMeliProductRepository implements IPostMeliProductRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async postProducts(
    products: PostMeliProductPayload[],
  ): Promise<PostMeliProductsResponse> {
    return this.httpClient.post<PostMeliProductsResponse>(
      '/internal/mercadolibre/products/bulk',
      { products },
    );
  }
}
