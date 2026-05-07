import { Injectable } from '@nestjs/common';
import { MeliHttpError } from './errors/MeliHttpError';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  headers?: Record<string, string>;
};

@Injectable()
export class MeliHttpClient {
  private readonly baseURL: string;
  private readonly apiKey?: string;

  constructor() {
    const baseURL = process.env.MELI_API_BASE_URL;

    if (!baseURL) {
      throw new Error('MELI_API_BASE_URL is not defined');
    }

    this.baseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
    this.apiKey = process.env.MELI_API_KEY;
  }

  async get<T>(
    url: string,
    params?: QueryParams,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('GET', url, { params, headers: options?.headers });
  }

  async post<T>(
    url: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('POST', url, { body, headers: options?.headers });
  }

  async put<T>(
    url: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PUT', url, { body, headers: options?.headers });
  }

  async patch<T>(
    url: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PATCH', url, { body, headers: options?.headers });
  }

  private async request<T>(
    method: string,
    url: string,
    options: {
      params?: QueryParams;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const requestUrl = this.buildUrl(url, options.params);

    try {
      const response = await fetch(requestUrl, {
        method,
        headers: this.buildHeaders(options.headers),
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        throw new MeliHttpError(
          response.status,
          data,
          `[MELI ${method}] ${requestUrl.pathname}`,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof MeliHttpError) {
        throw error;
      }

      throw new MeliHttpError(
        500,
        {
          message: error instanceof Error ? error.message : String(error),
          baseURL: this.baseURL,
          url,
        },
        `[MELI ${method}] ${url}`,
      );
    }
  }

  private buildUrl(url: string, params?: QueryParams): URL {
    const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;
    const requestUrl = new URL(normalizedUrl, this.baseURL);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) {
        requestUrl.searchParams.set(key, String(value));
      }
    }

    return requestUrl;
  }

  private buildHeaders(
    headers?: Record<string, string>,
  ): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      ...headers,
    };
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
