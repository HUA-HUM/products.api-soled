import { Injectable } from '@nestjs/common';

export type OnCityPublishPrices = {
  salePrice: number;
};

@Injectable()
export class ResolveOnCityPrices {
  execute(price: number): OnCityPublishPrices {
    if (!price || price <= 0) {
      throw new Error('INVALID_PRICE');
    }

    const salePrice = Math.round(price);

    return {
      salePrice,
    };
  }
}
