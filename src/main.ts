import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { AppModule } from './app/modules/app.module';
import {
  MARKETPLACE_CHANGE_ACTIONS_QUEUE,
  MARKETPLACE_PUBLICATIONS_SYNC_QUEUE,
  MELI_WEBHOOK_EVENTS_QUEUE,
  PUBLISHER_RUNS_QUEUE,
} from './app/modules/publisher-queue/publisher-queue.constants';
import { buildRedisConnection } from './app/modules/publisher-queue/redis-connection.factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Products API')
    .setDescription(
      'API para importar, sincronizar y publicar productos en marketplaces.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-internal-api-key',
        in: 'header',
        description:
          'API key interna cuando el endpoint expuesto requiera autenticacion.',
      },
      'internal-api-key',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
  });

  setupBullBoard(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

function setupBullBoard(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  if (process.env.BULL_BOARD_ENABLED === 'false') {
    return;
  }

  const route = process.env.BULL_BOARD_ROUTE ?? '/admin/queues';
  const username = process.env.BULL_BOARD_USERNAME;
  const password = process.env.BULL_BOARD_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'BULL_BOARD_USERNAME and BULL_BOARD_PASSWORD are required to enable Bull Board',
    );
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(route);

  const connection = buildRedisConnection();
  const publisherRunsQueue = new Queue(PUBLISHER_RUNS_QUEUE, { connection });
  const meliWebhookEventsQueue = new Queue(MELI_WEBHOOK_EVENTS_QUEUE, {
    connection,
  });
  const marketplaceChangeActionsQueue = new Queue(
    MARKETPLACE_CHANGE_ACTIONS_QUEUE,
    {
      connection,
    },
  );
  const marketplacePublicationsSyncQueue = new Queue(
    MARKETPLACE_PUBLICATIONS_SYNC_QUEUE,
    {
      connection,
    },
  );

  createBullBoard({
    queues: [
      new BullMQAdapter(publisherRunsQueue),
      new BullMQAdapter(meliWebhookEventsQueue),
      new BullMQAdapter(marketplaceChangeActionsQueue),
      new BullMQAdapter(marketplacePublicationsSyncQueue),
    ],
    serverAdapter,
  });

  app.use(route, bullBoardBasicAuth, serverAdapter.getRouter());
}

function bullBoardBasicAuth(
  req: { headers: Record<string, string | string[] | undefined> },
  res: {
    setHeader(name: string, value: string): void;
    status(code: number): { send(body: string): void };
  },
  next: () => void,
) {
  const username = process.env.BULL_BOARD_USERNAME;
  const password = process.env.BULL_BOARD_PASSWORD;

  const authorization = req.headers.authorization;
  const header = Array.isArray(authorization)
    ? authorization[0]
    : authorization;
  const [scheme, token] = String(header ?? '').split(' ');

  if (scheme === 'Basic' && token) {
    const credentials = Buffer.from(token, 'base64').toString('utf8');
    const separatorIndex = credentials.indexOf(':');
    const requestUsername = credentials.slice(0, separatorIndex);
    const requestPassword = credentials.slice(separatorIndex + 1);

    if (requestUsername === username && requestPassword === password) {
      return next();
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
  return res.status(401).send('Authentication required');
}
