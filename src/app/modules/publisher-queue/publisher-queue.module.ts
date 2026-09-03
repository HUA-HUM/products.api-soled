import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublisherQueueService } from 'src/app/services/publisher-queue/publisher-queue.service';
import {
  MARKETPLACE_CHANGE_ACTIONS_QUEUE,
  MARKETPLACE_PUBLICATIONS_SYNC_QUEUE,
  MELI_WEBHOOK_EVENTS_QUEUE,
  PUBLISHER_RUNS_QUEUE,
} from './publisher-queue.constants';
import { buildRedisConnection } from './redis-connection.factory';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: buildRedisConnection(),
      }),
    }),
    BullModule.registerQueue({
      name: PUBLISHER_RUNS_QUEUE,
    }),
    BullModule.registerQueue({
      name: MELI_WEBHOOK_EVENTS_QUEUE,
    }),
    BullModule.registerQueue({
      name: MARKETPLACE_CHANGE_ACTIONS_QUEUE,
    }),
    BullModule.registerQueue({
      name: MARKETPLACE_PUBLICATIONS_SYNC_QUEUE,
    }),
  ],
  providers: [PublisherQueueService],
  exports: [PublisherQueueService, BullModule],
})
export class PublisherQueueModule {}
