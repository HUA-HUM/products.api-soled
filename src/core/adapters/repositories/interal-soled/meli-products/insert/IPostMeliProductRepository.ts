import type {
  PostMeliProductPayload,
  PostMeliProductsResponse,
} from 'src/core/entitis/internal-soled/meli-products/insert/PostMeliProduct';

export interface IPostMeliProductRepository {
  postProducts(
    products: PostMeliProductPayload[],
  ): Promise<PostMeliProductsResponse>;
}
