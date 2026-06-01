export type ProcessMarketplaceImagesChannel = 'fravega' | 'oncity';

export type FravegaProcessedImage = {
  sourceUrl: string;
  fileName: string;
  publicUrl: string;
  width?: number;
  height?: number;
  format?: string;
};

export type OnCityProcessedImage = {
  sourceUrl: string;
  fileName?: string;
  uploadId?: string;
  status: 'uploaded' | 'failed';
  error?: string;
  uploadResponse?: {
    id?: string;
    slug?: string;
    fullUrl?: string;
  };
};

export interface IProcessMarketplaceImagesRepository {
  processFravega(params: {
    sku: string;
    imageUrls: string[];
  }): Promise<FravegaProcessedImage[]>;

  processOnCity(params: {
    sku: string;
    imageUrls: string[];
  }): Promise<OnCityProcessedImage[]>;
}
