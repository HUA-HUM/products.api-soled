import { Inject, Injectable } from '@nestjs/common';
import type { IOpenAIDescriptionGenerator } from 'src/core/adapters/repositories/openAi/IOpenAIDescriptionGenerator';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';

@Injectable()
export class ResolveProductDescription {
  constructor(
    @Inject('IOpenAIDescriptionGenerator')
    private readonly generator: IOpenAIDescriptionGenerator,
  ) {}

  async execute(product: InternalMeliProduct): Promise<string | null> {
    if (product.description) {
      return product.description;
    }

    if (!product.title) {
      return null;
    }

    try {
      return await this.generator.generate({
        title: product.title,
        brand: product.brand,
        model: product.model,
        categoryName: product.category_name,
        attributes: product.attributes ?? [],
      });
    } catch {
      return null;
    }
  }
}
