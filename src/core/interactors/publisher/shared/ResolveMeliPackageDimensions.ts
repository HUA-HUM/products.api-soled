import { Injectable } from '@nestjs/common';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';

export type MeliPackageDimensions = {
  height: number;
  length: number;
  width: number;
  weight: number;
};

const DEFAULT_DIMENSIONS: MeliPackageDimensions = {
  height: 1,
  length: 1,
  width: 1,
  weight: 1,
};

@Injectable()
export class ResolveMeliPackageDimensions {
  execute(product: InternalMeliProduct): MeliPackageDimensions {
    return {
      height:
        this.parseDimensionCm(
          this.getAttributeValue(product, 'SELLER_PACKAGE_HEIGHT'),
        ) ?? DEFAULT_DIMENSIONS.height,
      length:
        this.parseDimensionCm(
          this.getAttributeValue(product, 'SELLER_PACKAGE_LENGTH'),
        ) ?? DEFAULT_DIMENSIONS.length,
      width:
        this.parseDimensionCm(
          this.getAttributeValue(product, 'SELLER_PACKAGE_WIDTH'),
        ) ?? DEFAULT_DIMENSIONS.width,
      weight:
        this.parseWeightGrams(
          this.getAttributeValue(product, 'SELLER_PACKAGE_WEIGHT'),
        ) ?? DEFAULT_DIMENSIONS.weight,
    };
  }

  private getAttributeValue(
    product: InternalMeliProduct,
    attributeId: string,
  ): string | null {
    const attribute = product.attributes.find(
      (item) => item.id === attributeId,
    );

    return attribute?.value_name ?? null;
  }

  private parseDimensionCm(value: string | null): number | null {
    const parsed = this.parseNumberAndUnit(value);

    if (!parsed) {
      return null;
    }

    const unit = parsed.unit.toLowerCase();

    if (unit.includes('mm')) {
      return this.round(parsed.amount / 10);
    }

    if (unit.includes('m') && !unit.includes('cm') && !unit.includes('mm')) {
      return this.round(parsed.amount * 100);
    }

    return this.round(parsed.amount);
  }

  private parseWeightGrams(value: string | null): number | null {
    const parsed = this.parseNumberAndUnit(value);

    if (!parsed) {
      return null;
    }

    const unit = parsed.unit.toLowerCase();

    if (unit.includes('kg')) {
      return Math.max(1, Math.round(parsed.amount * 1000));
    }

    return Math.max(1, Math.round(parsed.amount));
  }

  private parseNumberAndUnit(
    value: string | null,
  ): { amount: number; unit: string } | null {
    if (!value) {
      return null;
    }

    const match = value
      .trim()
      .toLowerCase()
      .match(/(\d+(?:[.,]\d+)?)\s*([a-z]+)?/i);

    if (!match?.[1]) {
      return null;
    }

    const amount = Number(match[1].replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return {
      amount,
      unit: match[2] ?? '',
    };
  }

  private round(value: number): number {
    return Math.max(1, Number(value.toFixed(2)));
  }
}
