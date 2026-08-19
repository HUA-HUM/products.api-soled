import { Body, Controller, Headers, Logger, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import * as mercadolibreWebhookService from 'src/app/services/webhook/mercadolibre-webhook.service';

@ApiTags('Mercado Libre webhook')
@Controller('mercadolibre')
export class MercadoLibreWebhookController {
  private readonly logger = new Logger(MercadoLibreWebhookController.name);

  constructor(
    private readonly webhookService: mercadolibreWebhookService.MercadoLibreWebhookService,
  ) {}

  @Post('webhook')
  @ApiOperation({
    summary: 'Recibir webhook de Mercado Libre',
    description:
      'Recibe notificaciones de Mercado Libre, valida datos minimos, encola el evento en BullMQ y responde rapido.',
  })
  @ApiBody({
    required: false,
    schema: {
      example: {
        _id: 'abc123',
        topic: 'items',
        resource: '/items/MLA123456789',
        user_id: 6863691,
        application_id: 123456789,
        attempts: 1,
        sent: '2026-05-07T14:00:00.000Z',
        received: '2026-05-07T14:00:01.000Z',
      },
    },
  })
  @ApiOkResponse({
    description: 'Webhook recibido.',
    schema: {
      example: {
        ok: true,
        received: true,
        topic: 'items',
        resource: '/items/MLA123456789',
        meliItemId: 'MLA123456789',
        queued: true,
        bullmqJobId: 'meli-webhook:abc123',
        ignoredReason: null,
      },
    },
  })
  async receiveWebhook(
    @Body() body: mercadolibreWebhookService.MercadoLibreWebhookPayload = {},
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
  ): Promise<mercadolibreWebhookService.MercadoLibreWebhookResult> {
    this.logger.log(
      `[MELI-WEBHOOK] Request | ip=${req.ip} userAgent=${this.getHeaderValue(headers['user-agent']) ?? 'unknown'}`,
    );

    return this.webhookService.receive(body);
  }

  private getHeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      return value.join(',');
    }

    return value ?? null;
  }
}
