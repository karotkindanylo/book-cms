import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogResolver } from './activity-log.resolver';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';

@Module({
  imports: [DynamoDBModule],
  providers: [ActivityLogService, ActivityLogResolver],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
