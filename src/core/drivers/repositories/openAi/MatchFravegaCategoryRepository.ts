import { Injectable } from '@nestjs/common';
import type { IMatchFravegaCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchFravegaCategoryRepository';

type FravegaCategoryCandidate = {
  id: string;
  name: string;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class MatchFravegaCategoryRepository implements IMatchFravegaCategoryRepository {
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async match(params: {
    title: string;
    description?: string;
    categoryPath?: string;
    candidates: FravegaCategoryCandidate[];
  }): Promise<string | null> {
    if (!params.candidates.length) {
      return null;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return params.candidates[0].id;
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
              'Elegi la mejor categoria Fravega para publicar el producto. Responde solo JSON con la forma {"categoryId":"..."} y usa exclusivamente uno de los ids candidatos.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              product: {
                title: params.title,
                description: params.description ?? null,
                categoryPath: params.categoryPath ?? null,
              },
              candidates: params.candidates.map((candidate) => ({
                id: candidate.id,
                name: candidate.name,
              })),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return params.candidates[0].id;
    }

    const body = (await response.json()) as OpenAIChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;

    if (!content) {
      return params.candidates[0].id;
    }

    const categoryId = this.parseCategoryId(content);
    const validIds = new Set(
      params.candidates.map((candidate) => candidate.id),
    );

    return categoryId && validIds.has(categoryId)
      ? categoryId
      : params.candidates[0].id;
  }

  private parseCategoryId(content: string): string | null {
    try {
      const parsed = JSON.parse(content) as { categoryId?: unknown };
      return typeof parsed.categoryId === 'string' ? parsed.categoryId : null;
    } catch {
      return null;
    }
  }
}
