export type FravegaCategoryAttribute = {
  id: string;
  name: string;
  required: boolean;
  type: string;
  valueOptions?: Array<{
    t?: string;
    v: string;
  }>;
};
