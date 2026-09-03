export interface IOpenAIDescriptionGenerator {
  generate(params: {
    title: string;
    brand?: string | null;
    model?: string | null;
    categoryName?: string | null;
    attributes: { name: string; value_name: string | null }[];
  }): Promise<string | null>;
}
