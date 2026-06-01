import { Injectable } from '@nestjs/common';
import {
  FravegaProcessedImage,
  IProcessMarketplaceImagesRepository,
  OnCityProcessedImage,
} from 'src/core/adapters/repositories/image-market/IProcessMarketplaceImagesRepository';

const REQUEST_TIMEOUT_MS = 120_000;

type FravegaProcessResponse = {
  images?: FravegaProcessedImage[];
};

type OnCityProcessResponse = {
  images?: OnCityProcessedImage[];
};

@Injectable()
export class ProcessMarketplaceImagesRepository implements IProcessMarketplaceImagesRepository {
  private readonly baseUrl = this.resolveBaseUrl();

  async processFravega(params: {
    sku: string;
    imageUrls: string[];
  }): Promise<FravegaProcessedImage[]> {
    const response = await this.post<FravegaProcessResponse>(
      '/images/process',
      {
        sku: params.sku,
        channel: 'fravega',
        imageUrls: params.imageUrls,
      },
    );

    return response.images ?? [];
  }

  async processOnCity(params: {
    sku: string;
    imageUrls: string[];
  }): Promise<OnCityProcessedImage[]> {
    const response = await this.post<OnCityProcessResponse>(
      `/images/oncity/${encodeURIComponent(params.sku)}/process`,
      {
        imageUrls: params.imageUrls,
      },
    );

    return response.images ?? [];
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          `[IMAGE-MARKET POST] ${path} -> ${response.status} ${JSON.stringify(data)}`,
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveBaseUrl(): string {
    const baseUrl = process.env.CMD_IMAGES_MARKET_API_BASE_URL?.trim();

    if (!baseUrl) {
      throw new Error('CMD_IMAGES_MARKET_API_BASE_URL is not defined');
    }

    return baseUrl.replace(/\/+$/, '');
  }
}
