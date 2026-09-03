import { Injectable } from '@nestjs/common';
import type { IOpenAIDescriptionGenerator } from 'src/core/adapters/repositories/openAi/IOpenAIDescriptionGenerator';

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class OpenAIDescriptionGenerator implements IOpenAIDescriptionGenerator {
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async generate(params: {
    title: string;
    brand?: string | null;
    model?: string | null;
    categoryName?: string | null;
    attributes: { name: string; value_name: string | null }[];
  }): Promise<string | null> {
    if (!params.title) {
      return null;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return null;
    }

    const relevantAttributes = params.attributes
      .filter((attribute) => Boolean(attribute.value_name))
      .slice(0, 15)
      .map((attribute) => `${attribute.name}: ${attribute.value_name}`);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Redacta una descripcion de producto en espanol para publicarla en un marketplace (Fravega/OnCity), en base al titulo y los atributos recibidos. 2 a 4 parrafos cortos, en texto plano (sin markdown ni titulos), tono comercial y objetivo, sin inventar caracteristicas que no esten en los datos recibidos. Responde solo JSON con la forma {"description": "..."}.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                title: params.title,
                brand: params.brand ?? null,
                model: params.model ?? null,
                category: params.categoryName ?? null,
                attributes: relevantAttributes,
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as OpenAIChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content;

      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content) as { description?: unknown };
      const description =
        typeof parsed.description === 'string' ? parsed.description.trim() : '';

      return description || null;
    } catch {
      return null;
    }
  }
}
