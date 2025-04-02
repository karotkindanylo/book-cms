import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { ActivityLog, PaginatedActivityLogs } from './dto/activity.model';
import { ActivityLogParams } from './dto/activity-log.dto';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  private readonly tableName = 'activity_logs';

  constructor(
    @Inject('DYNAMO_CLIENT')
    private readonly dynamoClient: DynamoDBDocumentClient,
  ) {}

  async log(
    userId: string,
    action: string,
    details: string,
  ): Promise<ActivityLog> {
    try {
      const item = {
        id: uuid(),
        user_id: userId,
        timestamp: new Date().toISOString(),
        action,
        details,
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        }),
      );

      this.logger.log(`Activity logged: ${action} by user ${userId}`);
      return item;
    } catch (error) {
      this.logger.error(
        `Failed to log activity: ${error.message}`,
        error.stack,
      );
      return {
        id: 'log-failed',
        user_id: userId,
        timestamp: new Date().toISOString(),
        action,
        details,
      };
    }
  }

  async getUserActivityLogs(
    userId: string,
    params?: ActivityLogParams,
  ): Promise<PaginatedActivityLogs> {
    try {
      const { limit = 20, nextToken } = params || {};

      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false,
        Limit: limit,
      };

      if (nextToken) {
        queryParams.ExclusiveStartKey = JSON.parse(
          Buffer.from(nextToken, 'base64').toString(),
        );
      }

      const result = await this.dynamoClient.send(
        new QueryCommand(queryParams),
      );

      return {
        items: (result.Items || []) as ActivityLog[],
        count: result.Items?.length || 0,
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              'base64',
            )
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user activity logs: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve activity logs: ${error.message}`,
      );
    }
  }

  async getActivityLogsByAction(
    action: string,
    params?: ActivityLogParams,
  ): Promise<PaginatedActivityLogs> {
    try {
      const { limit = 20, nextToken } = params || {};

      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'ActionIndex',
        KeyConditionExpression: '#action = :action',
        ExpressionAttributeNames: {
          '#action': 'action',
        },
        ExpressionAttributeValues: {
          ':action': action,
        },
        ScanIndexForward: false,
        Limit: limit,
      };

      if (nextToken) {
        queryParams.ExclusiveStartKey = JSON.parse(
          Buffer.from(nextToken, 'base64').toString(),
        );
      }

      const result = await this.dynamoClient.send(
        new QueryCommand(queryParams),
      );

      return {
        items: (result.Items || []) as ActivityLog[],
        count: result.Items?.length || 0,
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              'base64',
            )
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get activity logs by action: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve activity logs: ${error.message}`,
      );
    }
  }

  async getRecentActivityLogs(
    params?: ActivityLogParams,
  ): Promise<PaginatedActivityLogs> {
    try {
      const { limit = 20, nextToken } = params || {};

      const scanParams: any = {
        TableName: this.tableName,
        Limit: limit,
      };

      if (nextToken) {
        scanParams.ExclusiveStartKey = JSON.parse(
          Buffer.from(nextToken, 'base64').toString(),
        );
      }

      const result = await this.dynamoClient.send(new ScanCommand(scanParams));

      const sortedItems = [...(result.Items || [])].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return {
        items: sortedItems as ActivityLog[],
        count: sortedItems.length,
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              'base64',
            )
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get recent activity logs: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve activity logs: ${error.message}`,
      );
    }
  }
}
