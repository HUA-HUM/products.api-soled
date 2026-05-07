export interface IOpenAIAttributesExtractor {
  extract(params: { title?: string; description: string; attributes: { name: string }[] }): Promise<Record<string, string>>;
}
