import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  IGetOnCityCategoriesTreeRepository,
  OnCityCategoryLeaf,
} from 'src/core/adapters/repositories/marketplace/oncity/GetCategoriesTree/IGetOnCityCategoriesTreeRepository';
import type { IMatchOnCityCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchOnCityCategoryRepository';

const HARDCODED_ONCITY_CATEGORIES = [
  { id: 51, name: 'Herramientas para Vehiculo' },
  { id: 77, name: 'Conectividad' },
  { id: 87, name: 'Otros componentes de informatica' },
  { id: 99, name: 'Monitores' },
  { id: 150, name: 'Estantes y Repisas' },
  { id: 155, name: 'Placares y roperos' },
  {
    id: 231,
    name: 'Accesorios de iluminacion',
    keywords:
      'toma tecla tomacorriente interruptor modulo bastidor enchufe electricidad electrico instalacion',
  },
  {
    id: 232,
    name: 'Otros productos de iluminacion',
    keywords: 'iluminacion electrico electricidad accesorio modulo led',
  },
  {
    id: 233,
    name: 'Luces de exterior',
    keywords: 'exterior jardin patio aplique luz solar intemperie',
  },
  {
    id: 234,
    name: 'Luces de emergencia',
    keywords: 'emergencia luz bateria salida',
  },
  { id: 235, name: 'Reflectores', keywords: 'reflector reflectores led' },
  { id: 238, name: 'Focos', keywords: 'foco focos bombita lampara led e27' },
  {
    id: 239,
    name: 'Lamparas',
    keywords: 'lampara lamparas colgante techo pared velador',
  },
  { id: 249, name: 'Sensores', keywords: 'sensor sensores movimiento humo' },
  { id: 254, name: 'Cajas fuertes' },
  { id: 255, name: 'Alarmas' },
  { id: 293, name: 'Otros articulos de Bazar' },
  { id: 313, name: 'Accesorios para Bano' },
  { id: 316, name: 'Contenedores y organizadores' },
  { id: 321, name: 'Energia Solar' },
  { id: 322, name: 'Accesorios para herramientas' },
  { id: 336, name: 'Accesorios para pintar' },
  { id: 346, name: 'Griferias' },
  { id: 348, name: 'Otros articulos de ferreteria' },
  { id: 349, name: 'Medicion' },
  { id: 350, name: 'Escaleras' },
  { id: 352, name: 'Cajas de herramientas' },
  { id: 354, name: 'Otras herramientas manuales' },
  { id: 356, name: 'Pinzas' },
  { id: 358, name: 'Llaves y accesorios' },
  { id: 359, name: 'Destornilladores' },
  { id: 361, name: 'Otras herramientas electricas' },
  { id: 362, name: 'Taladros y Destornilladores' },
  { id: 366, name: 'Generadores electricos' },
  { id: 367, name: 'Compresores de aire' },
  { id: 368, name: 'Amoladoras, sierras y morsas' },
  { id: 375, name: 'Accesorios de pequenos electrodomesticos' },
  { id: 376, name: 'Otros Pequenos electrodomesticos' },
  { id: 464, name: 'Accesorios para bicicleta' },
  { id: 556, name: 'Soportes y accesorios' },
  { id: 594, name: 'Jardineria y Accesorios' },
  { id: 602, name: 'Cortadoras de cesped' },
  { id: 605, name: 'Accesorios para piletas' },
  { id: 670, name: 'Accesorios de Limpieza' },
];

type OnCityCategoryProduct = {
  title?: string;
  description?: string;
  categoryPath?: string | string[];
  category_path?: string | string[];
};

@Injectable()
export class ResolveOnCityCategory {
  private readonly logger = new Logger(ResolveOnCityCategory.name);

  constructor(
    @Inject('IGetOnCityCategoriesTreeRepository')
    private readonly repository: IGetOnCityCategoriesTreeRepository,

    @Inject('IMatchOnCityCategoryRepository')
    private readonly matchRepository: IMatchOnCityCategoryRepository,
  ) {}

  async execute(product: OnCityCategoryProduct): Promise<string | null> {
    const candidates = await this.executeCandidates(product, 1);
    return candidates[0] ?? null;
  }

  async executeCandidates(
    product: OnCityCategoryProduct,
    limit = 5,
  ): Promise<string[]> {
    const allowedCategoryIds = this.getAllowedCategoryIds();

    if (!allowedCategoryIds.length) {
      const defaultCategoryId = process.env.ONCITY_DEFAULT_CATEGORY_ID?.trim();
      return defaultCategoryId ? [defaultCategoryId] : [];
    }

    if (!product.title) {
      return [];
    }

    const categories = await this.repository.getLeafCategories();
    const candidates = this.buildAllowedCandidates(
      categories,
      allowedCategoryIds,
    );

    if (!candidates.length) {
      this.logger.warn(
        `[ONCITY CATEGORY] No allowed candidates found | treeLeaves=${categories.length} allowed=${allowedCategoryIds.length}`,
      );
      return [];
    }

    this.logger.debug(
      `[ONCITY CATEGORY] Matching category | candidates=${candidates.length} title="${product.title}"`,
    );

    const selectedId = await this.matchRepository.match({
      title: product.title,
      description: product.description,
      categoryPath: this.normalizeCategoryPath(
        product.categoryPath ?? product.category_path,
      ),
      candidates,
    });

    const orderedIds = [
      ...(selectedId ? [selectedId] : []),
      ...candidates
        .map((category) => String(category.id))
        .filter((id) => id !== selectedId),
    ];

    return orderedIds.slice(0, limit);
  }

  private buildAllowedCandidates(
    categories: OnCityCategoryLeaf[],
    allowedCategoryIds: number[],
  ): OnCityCategoryLeaf[] {
    const allowed = new Set(allowedCategoryIds);
    const fromTree = categories
      .filter((category) => allowed.has(Number(category.id)))
      .map((category) => this.enrichCandidate(category));
    const foundIds = new Set(fromTree.map((category) => Number(category.id)));
    const fallbackCandidates = HARDCODED_ONCITY_CATEGORIES.filter(
      (category) => allowed.has(category.id) && !foundIds.has(category.id),
    ).map((category) => ({
      id: category.id,
      name: category.name,
      path: [category.name, category.keywords ?? ''].filter(Boolean),
    }));

    return [...fromTree, ...fallbackCandidates];
  }

  private enrichCandidate(category: OnCityCategoryLeaf): OnCityCategoryLeaf {
    const hardcoded = HARDCODED_ONCITY_CATEGORIES.find(
      (item) => item.id === Number(category.id),
    );

    if (!hardcoded?.keywords) {
      return category;
    }

    return {
      ...category,
      path: [...category.path, hardcoded.keywords],
    };
  }

  private getAllowedCategoryIds(): number[] {
    const fromEnv = (process.env.ONCITY_ALLOWED_CATEGORY_IDS ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));

    const hardcodedIds = HARDCODED_ONCITY_CATEGORIES.map(
      (category) => category.id,
    );

    return [...new Set([...hardcodedIds, ...fromEnv])];
  }

  private normalizeCategoryPath(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value.join(' > ');
    }

    if (!value) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.join(' > ') : value;
    } catch {
      return value;
    }
  }
}
