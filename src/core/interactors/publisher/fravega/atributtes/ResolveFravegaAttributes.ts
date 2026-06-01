import { Inject, Injectable } from '@nestjs/common';
import type { IGetFravegaCategoriesTreeRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';
import type { IOpenAIAttributesExtractor } from 'src/core/adapters/repositories/openAi/IOpenAIAttributesExtractor';
import type { FravegaCategoryAttribute } from 'src/core/entitis/marketplace-api/fravega/GetAtributtes/FravegaCategoryAttribute';

@Injectable()
export class ResolveFravegaAttributes {
  constructor(
    @Inject('IGetFravegaCategoriesTreeRepository')
    private readonly categoriesRepository: IGetFravegaCategoriesTreeRepository,

    @Inject('IOpenAIAttributesExtractor')
    private readonly openAI: IOpenAIAttributesExtractor,
  ) {}

  async execute(
    categoryId: string,
    product: any,
  ): Promise<
    { id: string; name: string; value: string | number | boolean }[] | null
  > {
    /* ======================================
       1. GET CATEGORY ATTRIBUTES
    ====================================== */
    const categoryAttributes = await this.getCategoryAttributes(categoryId);

    if (!categoryAttributes?.length) {
      console.log('[FRAVEGA ATTR] No attributes found for category', {
        categoryId,
        sku: product?.sku ?? null,
      });
      return [];
    }

    /* ======================================
       2. OPENAI para todos los atributos
    ====================================== */
    const aiValues = await this.openAI.extract({
      title: product.title,
      description: product.description,
      attributes: categoryAttributes.map((attr) => ({
        name: attr.name,
      })),
    });

    /* ======================================
       3. BUILD FINAL ATTRIBUTES
    ====================================== */
    const result: {
      id: string;
      name: string;
      value: string | number | boolean;
    }[] = [];

    for (const attr of categoryAttributes) {
      let value: any = null;

      /* ======================================
         LOCAL (si tenés algo)
      ====================================== */
      value = this.tryLocal(product, attr.name);

      /* ======================================
         OPENAI FALLBACK
      ====================================== */
      if (this.isEmptyValue(value)) {
        value = aiValues?.[attr.name];
      }

      /* ======================================
         DEFAULT
      ====================================== */
      if (this.isEmptyValue(value)) {
        value = this.getDefaultValue(attr.type);
      }

      if (this.isEmptyValue(value)) {
        value = this.getFallbackTextValue(attr);
      }

      value = this.sanitizeValueByType(value, attr.type);
      value = this.normalizeToAllowedOption(value, attr);

      /* ======================================
         VALIDACIÓN
      ====================================== */
      if (value === null || value === undefined) {
        console.log('[FRAVEGA ATTR] Missing required attribute', {
          categoryId,
          sku: product?.sku ?? null,
          attribute: attr.name,
          type: attr.type,
        });
        return null; // 🚨 skip producto
      }

      result.push({
        id: attr.id,
        name: attr.name,
        value,
      });
    }

    return result;
  }

  private async getCategoryAttributes(
    categoryId: string,
  ): Promise<FravegaCategoryAttribute[]> {
    const categories = await this.categoriesRepository.getLeafCategories();
    const category = categories.find((item) => item.id === categoryId);

    if (!category?.attributes?.length) {
      return [];
    }

    return category.attributes
      .filter((attribute) => Boolean(attribute.name))
      .map((attribute) => ({
        id: attribute.ID ?? attribute.id ?? attribute.name,
        name: attribute.name,
        required: attribute.required ?? false,
        type: attribute.type ?? 'text',
        valueOptions: attribute.valueOptions ?? [],
      }));
  }

  /* ======================================
     LOCAL EXTRACTOR (simple)
  ====================================== */
  private tryLocal(product: any, attrName: string): any {
    const raw = this.buildMeliAttributesMap(product);
    const title = String(product?.title ?? '');
    const description = String(product?.description ?? '');
    const fullText = `${title} ${description}`.toLowerCase();

    const map: Record<string, string> = {
      Color: raw.color ?? raw.main_color,
      Colores: raw.color ?? raw.main_color,
      Marca: raw.brand,
      Modelo: raw.model,
      Estilo: raw.estilo,
      Tipo: raw.tipo,
    };

    if (attrName === 'Color' || attrName === 'Colores') {
      return map[attrName] || this.inferColor(fullText);
    }

    if (attrName === 'Capacidad (lts)') {
      return this.extractCapacityLiters(fullText);
    }

    if (attrName === 'Forma') {
      if (fullText.includes('plegable') || fullText.includes('foldable')) {
        return 'Plegable';
      }

      if (fullText.includes('esquinero')) {
        return 'Esquinero';
      }

      if (fullText.includes('en l')) {
        return 'En L';
      }

      return 'Otros';
    }

    if (attrName === 'Tipo de sierra') {
      return this.inferSawType(fullText);
    }

    return map[attrName] || null;
  }

  private buildMeliAttributesMap(product: any): Record<string, string> {
    const result: Record<string, string> = {};

    if (product?.brand) {
      result.brand = product.brand;
    }

    if (product?.model) {
      result.model = product.model;
    }

    if (!Array.isArray(product?.attributes)) {
      return result;
    }

    for (const attribute of product.attributes) {
      const id = this.normalizeAttributeKey(attribute?.id);
      const name = this.normalizeAttributeKey(attribute?.name);
      const value = attribute?.value_name;

      if (!value) {
        continue;
      }

      if (id) {
        result[id] = value;
      }

      if (name) {
        result[name] = value;
      }
    }

    return result;
  }

  private normalizeAttributeKey(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private getDefaultValue(type?: string): string | number | boolean | null {
    const normalizedType = type?.toLowerCase();

    if (
      !normalizedType ||
      normalizedType === 'text' ||
      normalizedType === 'string'
    ) {
      return null;
    }

    if (
      normalizedType === 'integer' ||
      normalizedType === 'number' ||
      normalizedType === 'float'
    ) {
      return 0;
    }

    if (normalizedType === 'boolean' || normalizedType === 'bool') {
      return false;
    }

    return null;
  }

  private getFallbackTextValue(attr: FravegaCategoryAttribute): string | null {
    const normalizedType = attr.type?.toLowerCase();

    if (
      normalizedType &&
      normalizedType !== 'text' &&
      normalizedType !== 'string'
    ) {
      return null;
    }

    const options = attr.valueOptions ?? [];

    if (options.length) {
      return options[0]?.v ?? null;
    }

    return 'NA';
  }

  private isEmptyValue(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  private sanitizeValueByType(
    value: any,
    type?: string,
  ): string | number | boolean | null {
    const normalizedType = type?.toLowerCase();

    if (
      normalizedType === 'integer' ||
      normalizedType === 'number' ||
      normalizedType === 'float'
    ) {
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (normalizedType === 'boolean' || normalizedType === 'bool') {
      if (typeof value === 'boolean') {
        return value;
      }

      const normalizedValue = String(value).trim().toLowerCase();

      if (['si', 'sí', 'true', '1', 'yes'].includes(normalizedValue)) {
        return true;
      }

      if (['no', 'false', '0'].includes(normalizedValue)) {
        return false;
      }

      return false;
    }

    return value;
  }

  private normalizeToAllowedOption(
    value: string | number | boolean | null,
    attr: FravegaCategoryAttribute,
  ): string | number | boolean | null {
    if (value === null || value === undefined) {
      return value;
    }

    const options = attr.valueOptions ?? [];

    if (!options.length) {
      return value;
    }

    const normalizedValue = this.normalizeText(String(value));
    const exactMatch = options.find(
      (option) => this.normalizeText(option.v) === normalizedValue,
    );

    if (exactMatch) {
      return exactMatch.v;
    }

    const heuristicMap = this.buildOptionHeuristics(String(value), attr.name);
    const heuristicMatch = heuristicMap
      .map((candidate) =>
        options.find(
          (option) =>
            this.normalizeText(option.v) === this.normalizeText(candidate),
        ),
      )
      .find(Boolean);

    return heuristicMatch?.v ?? null;
  }

  private buildOptionHeuristics(value: string, attrName: string): string[] {
    const normalizedValue = this.normalizeText(value);
    const normalizedAttr = this.normalizeText(attrName);

    if (normalizedAttr.includes('color')) {
      const colorMap: Record<string, string[]> = {
        black: ['Negro'],
        blanco: ['Blanco'],
        white: ['Blanco'],
        grey: ['Gris'],
        gray: ['Gris'],
        red: ['Rojo'],
        blue: ['Azul'],
        green: ['Verde'],
        brown: ['Marrón'],
        pink: ['Rosa'],
      };

      const matchedColor = Object.entries(colorMap).find(([key]) =>
        normalizedValue.includes(key),
      );

      return matchedColor?.[1] ?? colorMap[normalizedValue] ?? [value];
    }

    if (normalizedAttr.includes('material')) {
      if (normalizedValue.includes('acero')) {
        return ['Acero', 'Metal'];
      }

      if (normalizedValue.includes('metal')) {
        return ['Metal', 'Acero'];
      }

      if (normalizedValue.includes('madera')) {
        return ['Madera'];
      }

      if (normalizedValue.includes('fibra de carbono')) {
        return ['Fibra de carbono'];
      }
    }

    if (normalizedAttr.includes('forma')) {
      if (normalizedValue.includes('plegable')) {
        return ['Plegable'];
      }

      if (normalizedValue.includes('rect')) {
        return ['Recto'];
      }
    }

    if (normalizedAttr.includes('tipo de sierra')) {
      const sawType = this.inferSawType(normalizedValue);

      if (sawType) {
        return [sawType];
      }
    }

    return [value];
  }

  private inferSawType(fullText: string): string | null {
    const normalized = this.normalizeText(fullText);

    if (!normalized) {
      return null;
    }

    if (
      normalized.includes('caladora') ||
      normalized.includes('jigsaw') ||
      normalized.includes('vaiven')
    ) {
      return 'Caladora';
    }

    if (
      normalized.includes('circular') ||
      normalized.includes('circular saw') ||
      normalized.includes('disco')
    ) {
      return 'Circular';
    }

    if (
      normalized.includes('sable') ||
      normalized.includes('reciprocante') ||
      normalized.includes('reciproca') ||
      normalized.includes('reciprocating')
    ) {
      return 'Sable';
    }

    if (
      normalized.includes('ingletadora') ||
      normalized.includes('miter saw') ||
      normalized.includes('sensitiva')
    ) {
      return 'Ingletadora';
    }

    if (
      normalized.includes('de banco') ||
      normalized.includes('de mesa') ||
      normalized.includes('table saw')
    ) {
      return 'De banco';
    }

    if (
      normalized.includes('sin fin') ||
      normalized.includes('de cinta') ||
      normalized.includes('band saw')
    ) {
      return 'Sin fin';
    }

    if (
      normalized.includes('marqueteria') ||
      normalized.includes('scroll saw')
    ) {
      return 'Marquetería';
    }

    if (normalized.includes('cadena') || normalized.includes('chainsaw')) {
      return 'De cadena';
    }

    return null;
  }

  private inferColor(fullText: string): string | null {
    const normalized = this.normalizeText(fullText);

    const colorMap: Record<string, string> = {
      negro: 'Negro',
      black: 'Negro',
      blanco: 'Blanco',
      white: 'Blanco',
      gris: 'Gris',
      gray: 'Gris',
      'gris oscuro': 'Gris oscuro',
      'gris claro': 'Gris claro',
      rojo: 'Rojo',
      red: 'Rojo',
      azul: 'Azul',
      blue: 'Azul',
      verde: 'Verde',
      green: 'Verde',
      marron: 'Marrón',
      brown: 'Marrón',
      rosa: 'Rosa',
      pink: 'Rosa',
      beige: 'Beige',
      plata: 'Plata',
      silver: 'Plata',
    };

    const matchedColor = Object.entries(colorMap).find(([key]) =>
      normalized.includes(key),
    );

    return matchedColor?.[1] ?? null;
  }

  private extractCapacityLiters(fullText: string): string | number | null {
    const normalized = this.normalizeText(fullText);
    const match = normalized.match(/(\d+(?:[.,]\d+)?)\s*(l|lt|lts|litros?)/i);

    if (!match?.[1]) {
      return null;
    }

    return match[1].replace(',', '.');
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
