import { Module } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { ReviewsService } from 'src/reviews/reviews.service';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || '',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

@Module({
  providers: [
    {
      provide: 'DYNAMO_CLIENT',
      useValue: docClient,
    },
    ReviewsService,
    ActivityLogService,
  ],
  exports: ['DYNAMO_CLIENT'],
  controllers: [],
})
export class DynamoDBModule {}
