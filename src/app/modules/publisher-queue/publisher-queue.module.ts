import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublisherQueueService } from 'src/app/services/publisher-queue/publisher-queue.service';
import { PUBLISHER_RUNS_QUEUE } from './publisher-queue.constants';
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
  ],
  providers: [PublisherQueueService],
  exports: [PublisherQueueService, BullModule],
})
export class PublisherQueueModule {}
