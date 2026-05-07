import { Controller, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ImportAllProdcutsFromMeli } from 'src/core/interactors/import-meli/ImportAllProdcutsFromMeli';
import type { ImportAllProdcutsFromMeliSummary } from 'src/core/interactors/import-meli/ImportAllProdcutsFromMeli';
import { ImportMeliProductsResponseDto } from './dto/ImportMeliProductsResponseDto';

@ApiTags('Meli import')
@Controller('meli/import')
export class MeliImportController {
  constructor(private readonly importAllProducts: ImportAllProdcutsFromMeli) {}

  @Post('products')
  @ApiOperation({
    summary: 'Importar productos activos de MercadoLibre',
    description:
      'Consulta IDs activos en Meli usando scan/scroll, pagina hasta agotar resultados, obtiene el detalle de cada MLA y guarda los productos en Internal Soled con inserciones bulk. No recibe body: el interactor controla el limite por pagina, el tamano de lote y el scroll_id.',
  })
  @ApiOkResponse({
    type: ImportMeliProductsResponseDto,
    description:
      'Resumen de la importacion, incluyendo paginas procesadas, cantidades insertadas y errores recuperables.',
  })
  @ApiBadGatewayResponse({
    description:
      'Fallo no recuperado al comunicarse con Meli API o Internal Soled.',
  })
  async importProducts(): Promise<ImportAllProdcutsFromMeliSummary> {
    return this.importAllProducts.execute();
  }
}
