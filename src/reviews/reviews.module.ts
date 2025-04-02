import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { ReviewsResolver } from './reviews.resolver';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { CacheModule } from '@nestjs/cache-manager';
import { GqlThrottlerGuard } from 'src/auth/guards/gql-throttler.guard';

@Module({
  imports: [
    DynamoDBModule,
    CacheModule.register(),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 5,
      },
    ]),
  ],
  providers: [
    ReviewsService,
    ReviewsResolver,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
