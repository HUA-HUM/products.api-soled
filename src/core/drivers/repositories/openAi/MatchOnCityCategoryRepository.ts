import { Injectable } from '@nestjs/common';
import type { IMatchOnCityCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchOnCityCategoryRepository';

type OnCityCategoryCandidate = {
  id: number;
  name: string;
  path: string[];
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class MatchOnCityCategoryRepository implements IMatchOnCityCategoryRepository {
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async match(params: {
    title: string;
    description?: string;
    categoryPath?: string;
    candidates: OnCityCategoryCandidate[];
  }): Promise<string | null> {
    const { title, description = '', categoryPath = '', candidates } = params;

    if (!candidates.length) {
      return null;
    }

    const shortlisted = this.buildShortlist(title, categoryPath, candidates);

    if (!shortlisted.length) {
      return null;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return String(shortlisted[0].id);
    }

    const options = shortlisted.map((category) => ({
      id: String(category.id),
      name: category.name,
      path: category.path.join(' > '),
    }));

    const prompt = `
Elegí la mejor categoria HIJA de OnCity para este producto.

PRODUCTO:
- titulo: ${title}
- categoryPath: ${categoryPath || '-'}
- descripcion: ${description.slice(0, 1200) || '-'}

CATEGORIAS CANDIDATAS:
${JSON.stringify(options, null, 2)}

Reglas:
- Elegí SOLO una categoria final/especifica
- Priorizá categoryPath por encima del titulo si hay conflicto
- No elijas categorias padre o demasiado generales
- Devolvé SOLO JSON valido con este formato:
{"categoryId":"..."}
`;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      return String(shortlisted[0].id);
    }

    const body = (await response.json()) as OpenAIChatCompletionResponse;
    const rawContent = body.choices?.[0]?.message?.content ?? '{}';
    const categoryId = this.parseCategoryId(this.extractJson(rawContent));
    const selected = shortlisted.find(
      (category) => String(category.id) === categoryId,
    );

    return selected ? String(selected.id) : String(shortlisted[0].id);
  }

  private buildShortlist(
    title: string,
    categoryPath: string,
    candidates: OnCityCategoryCandidate[],
  ): OnCityCategoryCandidate[] {
    const productTokens = this.tokenize(`${title} ${categoryPath}`);

    const ranked = candidates
      .map((category) => ({
        category,
        score: this.scoreCategory(productTokens, category),
      }))
      .sort((a, b) => b.score - a.score);

    const positiveMatches = ranked
      .filter((item) => item.score > 0)
      .slice(0, 30)
      .map((item) => item.category);

    if (positiveMatches.length > 0) {
      return positiveMatches;
    }

    return ranked.slice(0, 20).map((item) => item.category);
  }

  private scoreCategory(
    productTokens: string[],
    category: OnCityCategoryCandidate,
  ): number {
    const categoryTokens = this.tokenize(
      `${category.name} ${category.path.join(' ')}`,
    );

    if (!categoryTokens.length) {
      return 0;
    }

    return categoryTokens.reduce((score, token) => {
      return score + (productTokens.includes(token) ? 1 : 0);
    }, 0);
  }

  private tokenize(text: string): string[] {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  private parseCategoryId(content: string): string | null {
    try {
      const parsed = JSON.parse(content) as { categoryId?: unknown };
      return typeof parsed.categoryId === 'string' ? parsed.categoryId : null;
    } catch {
      return null;
    }
  }

  private extractJson(content: string): string {
    return content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
}
