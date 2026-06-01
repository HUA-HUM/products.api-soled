import { Injectable } from '@nestjs/common';
import type { IOpenAIAttributesExtractor } from 'src/core/adapters/repositories/openAi/IOpenAIAttributesExtractor';

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class OpenAIAttributesExtractor implements IOpenAIAttributesExtractor {
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async extract(params: {
    title?: string;
    description: string;
    attributes: { name: string }[];
  }): Promise<Record<string, string>> {
    if (!params.attributes.length) {
      return {};
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {};
    }

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
              'Extrae atributos para publicar un producto en Fravega. Responde solo JSON plano donde cada clave sea exactamente el nombre de atributo recibido y cada valor sea breve. Si no hay informacion suficiente, usa "NA".',
          },
          {
            role: 'user',
            content: JSON.stringify({
              product: {
                title: params.title ?? null,
                description: params.description,
              },
              attributes: params.attributes,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return {};
    }

    const body = (await response.json()) as OpenAIChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;

    if (!content) {
      return {};
    }

    return this.parseAttributes(content, params.attributes);
  }

  private parseAttributes(
    content: string,
    attributes: { name: string }[],
  ): Record<string, string> {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const allowedNames = new Set(
        attributes.map((attribute) => attribute.name),
      );
      const result: Record<string, string> = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (!allowedNames.has(key)) {
          continue;
        }

        if (value === null || value === undefined) {
          continue;
        }

        result[key] = String(value).trim();
      }

      return result;
    } catch {
      return {};
    }
  }
}
