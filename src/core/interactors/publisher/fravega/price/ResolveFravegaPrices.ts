import { Injectable } from '@nestjs/common';

@Injectable()
export class ResolveFravegaPrices {
  execute(price: number) {
    if (!price || price <= 0) {
      throw new Error('INVALID_PRICE');
    }

    const sale = Math.round(price);
    const list = sale;
    const net = Math.round(sale / 1.21);

    return {
      list,
      sale,
      net,
    };
  }
}
