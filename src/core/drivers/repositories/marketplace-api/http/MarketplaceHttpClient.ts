import axios, { AxiosInstance, AxiosError } from 'axios';
import { MarketplaceHttpError } from './errors/MarketplaceHttpError';

export class MarketplaceHttpClient {
  private readonly client: AxiosInstance;

  constructor() {
    const baseURL = process.env.MARKETPLACE_API_BASE_URL;

    if (!baseURL) {
      throw new Error('MARKETPLACE_API_BASE_URL is not defined');
    }

    this.client = axios.create({
      baseURL,
      timeout: 90000,
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      }
    });
  }

  /* ======================================
     GET
  ====================================== */
  async get<T>(url: string, params?: any): Promise<T> {
    try {
      const response = await this.client.get<T>(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError('GET', url, error);
    }
  }

  /* ======================================
     POST
  ====================================== */
  async post<T>(url: string, body: any): Promise<T> {
    try {
      const response = await this.client.post<T>(url, body);
      return response.data;
    } catch (error) {
      throw this.handleError('POST', url, error);
    }
  }

  /* ======================================
     PUT
  ====================================== */
  async put<T>(url: string, body: any): Promise<T> {
    try {
      const response = await this.client.put<T>(url, body);
      return response.data;
    } catch (error) {
      throw this.handleError('PUT', url, error);
    }
  }

  /* ======================================
     ERROR HANDLER
  ====================================== */
  private handleError(method: string, url: string, error: unknown): MarketplaceHttpError {
    const err = error as AxiosError;

    if (err.response) {
      return new MarketplaceHttpError(err.response.status, err.response.data, `[MARKETPLACE ${method}] ${url}`);
    }

    return new MarketplaceHttpError(500, err.message, `[MARKETPLACE ${method}] ${url}`);
  }
}
