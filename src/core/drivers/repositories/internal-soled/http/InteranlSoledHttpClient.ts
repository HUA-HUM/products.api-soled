import axios, { AxiosInstance, AxiosError } from 'axios';
import { Injectable } from '@nestjs/common';
import * as http from 'node:http';
import * as https from 'node:https';
import { InteranlSoledHttpError } from './errors/InteranlSoledHttpError';

type RequestOptions = {
  headers?: Record<string, string>;
};

type QueryParams = Record<string, unknown>;

@Injectable()
export class InteranlSoledHttpClient {
  private readonly client: AxiosInstance;
  private readonly apiKey?: string;

  constructor() {
    const baseURL =
      process.env.INTERNAL_SOLED_API_BASE_URL ??
      process.env.InteranlSoled_API_BASE_URL;

    if (!baseURL) {
      throw new Error('INTERNAL_SOLED_API_BASE_URL is not defined');
    }

    this.apiKey = process.env.INTERNAL_SOLED_API_KEY;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      // Some upstreams close idle keep-alive sockets aggressively. Using
      // explicit non-keepalive agents avoids reusing a broken socket and
      // prevents intermittent EPIPE/ECONNRESET on follow-up requests.
      httpAgent: new http.Agent({ keepAlive: false }),
      httpsAgent: new https.Agent({ keepAlive: false }),
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
    });
  }

  async get<T>(
    url: string,
    params?: QueryParams,
    options?: RequestOptions,
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(url, {
        params,
        headers: this.buildHeaders(options?.headers),
      });
      return response.data;
    } catch (error) {
      throw this.handleError('GET', url, error);
    }
  }

  async post<T>(
    url: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    try {
      const response = await this.client.post<T>(url, body, {
        headers: this.buildHeaders(options?.headers),
      });
      return response.data;
    } catch (error) {
      throw this.handleError('POST', url, error);
    }
  }

  async put<T>(url: string, body: unknown): Promise<T> {
    try {
      const response = await this.client.put<T>(url, body, {
        headers: this.buildHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError('PUT', url, error);
    }
  }

  async patch<T>(url: string, body: unknown): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, body, {
        headers: this.buildHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError('PATCH', url, error);
    }
  }

  private handleError(
    method: string,
    url: string,
    error: unknown,
  ): InteranlSoledHttpError {
    const err = error as AxiosError;

    if (err.response) {
      return new InteranlSoledHttpError(
        err.response.status,
        err.response.data,
        `[InteranlSoled ${method}] ${url}`,
      );
    }

    return new InteranlSoledHttpError(
      500,
      {
        message: err.message,
        code: err.code,
        baseURL: this.client.defaults.baseURL,
        url,
      },
      `[InteranlSoled ${method}] ${url}`,
    );
  }

  private buildHeaders(
    headers?: Record<string, string>,
  ): Record<string, string> | undefined {
    return {
      ...(this.apiKey ? { 'x-internal-api-key': this.apiKey } : {}),
      ...headers,
    };
  }
}
