import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewPaginationParams,
} from './dto/review.dto';
import { Review } from './dto/review.model';
import { v4 as uuid } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly tableName = 'book_reviews';

  constructor(
    @Inject('DYNAMO_CLIENT')
    private readonly dynamoClient: DynamoDBDocumentClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async addReview(input: CreateReviewInput, userId: string): Promise<Review> {
    try {
      if (input.rating < 1 || input.rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      const existingReviews = await this.getUserBookReview(
        input.book_id,
        userId,
      );
      if (existingReviews.length > 0) {
        throw new BadRequestException('You have already reviewed this book');
      }

      const review = {
        book_id: input.book_id,
        review_id: uuid(),
        user_id: userId,
        rating: input.rating,
        comment: input.comment,
        timestamp: new Date().toISOString(),
      };

      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: review,
        }),
      );

      await this.invalidateBookReviewsCache(input.book_id);

      return review;
    } catch (error) {
      this.logger.error(`Failed to add review: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to add review: ${error.message}`);
    }
  }

  async updateReview(
    reviewId: string,
    input: UpdateReviewInput,
    userId: string,
  ): Promise<Review> {
    try {
      const review = await this.getReviewById(input.book_id, reviewId);

      if (!review) {
        throw new NotFoundException(`Review with ID ${reviewId} not found`);
      }

      if (review.user_id !== userId) {
        throw new BadRequestException('You can only update your own reviews');
      }

      if (input.rating && (input.rating < 1 || input.rating > 5)) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      const updateExpression: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (input.rating !== undefined) {
        updateExpression.push('#rating = :rating');
        expressionAttributeValues[':rating'] = input.rating;
        expressionAttributeNames['#rating'] = 'rating';
      }

      if (input.comment !== undefined) {
        updateExpression.push('#comment = :comment');
        expressionAttributeValues[':comment'] = input.comment;
        expressionAttributeNames['#comment'] = 'comment';
      }

      updateExpression.push('#timestamp = :timestamp');
      expressionAttributeValues[':timestamp'] = new Date().toISOString();
      expressionAttributeNames['#timestamp'] = 'timestamp';

      if (updateExpression.length === 1) {
        return review;
      }

      const result = await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            book_id: review.book_id,
            review_id: reviewId,
          },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW',
        }),
      );

      await this.invalidateBookReviewsCache(review.book_id);

      return result.Attributes as Review;
    } catch (error) {
      this.logger.error(
        `Failed to update review: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update review: ${error.message}`,
      );
    }
  }

  async deleteReview(
    bookId: string,
    reviewId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const review = await this.getReviewById(bookId, reviewId);

      if (!review) {
        throw new NotFoundException(`Review with ID ${reviewId} not found`);
      }

      if (review.user_id !== userId) {
        throw new BadRequestException('You can only delete your own reviews');
      }

      await this.dynamoClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: {
            book_id: review.book_id,
            review_id: reviewId,
          },
        }),
      );

      await this.invalidateBookReviewsCache(review.book_id);

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete review: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete review: ${error.message}`,
      );
    }
  }

  async getReviews(
    bookId: string,
    params?: ReviewPaginationParams,
  ): Promise<{ items: Review[]; count: number; nextToken?: string }> {
    try {
      const { limit = 10, nextToken } = params || {};

      if (!nextToken) {
        const cacheKey = `reviews:book:${bookId}:limit:${limit}`;
        const cachedReviews = await this.cacheManager.get<{
          items: Review[];
          count: number;
        }>(cacheKey);

        if (cachedReviews) {
          this.logger.log(`Cache hit for ${cacheKey}`);
          return cachedReviews;
        }
      }

      const queryParams: any = {
        TableName: this.tableName,
        KeyConditionExpression: 'book_id = :bookId',
        ExpressionAttributeValues: {
          ':bookId': bookId,
        },
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

      const reviews = result.Items as Review[];

      const response = {
        items: reviews,
        count: reviews.length,
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              'base64',
            )
          : undefined,
      };

      if (!nextToken) {
        const cacheKey = `reviews:book:${bookId}:limit:${limit}`;
        await this.cacheManager.set(cacheKey, response, 600000);
      }

      return response;
    } catch (error) {
      this.logger.error(`Failed to get reviews: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get reviews: ${error.message}`);
    }
  }

  async getReviewById(
    bookId: string,
    reviewId: string,
  ): Promise<Review | null> {
    try {
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'book_id = :bookId AND review_id = :reviewId',
        ExpressionAttributeValues: {
          ':bookId': bookId,
          ':reviewId': reviewId,
        },
      };
      const result = await this.dynamoClient.send(new QueryCommand(params));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return result.Items[0] as Review;
    } catch (error) {
      this.logger.error(
        `Failed to get review by ID: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get review by ID: ${error.message}`,
      );
    }
  }

  async getUserBookReview(bookId: string, userId: string): Promise<Review[]> {
    try {
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'book_id = :bookId',
        FilterExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':bookId': bookId,
          ':userId': userId,
        },
      };

      const result = await this.dynamoClient.send(new QueryCommand(params));

      return (result.Items || []) as Review[];
    } catch (error) {
      this.logger.error(
        `Failed to get user book review: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get user book review: ${error.message}`,
      );
    }
  }

  async getUserReviews(
    userId: string,
    params?: ReviewPaginationParams,
  ): Promise<{ items: Review[]; count: number; nextToken?: string }> {
    try {
      const { limit = 10, nextToken } = params || {};

      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
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

      const reviews = result.Items as Review[];

      return {
        items: reviews,
        count: reviews.length,
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              'base64',
            )
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user reviews: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get user reviews: ${error.message}`,
      );
    }
  }

  async getBookStats(
    bookId: string,
  ): Promise<{ averageRating: number; totalReviews: number }> {
    try {
      const cacheKey = `reviews:stats:${bookId}`;
      const cachedStats = await this.cacheManager.get<{
        averageRating: number;
        totalReviews: number;
      }>(cacheKey);

      if (cachedStats) {
        return cachedStats;
      }

      const reviews = await this.getReviews(bookId);

      if (!reviews.items || reviews.items.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      const totalRating = reviews.items.reduce(
        (sum, review) => sum + review.rating,
        0,
      );
      const averageRating = totalRating / reviews.items.length;

      const stats = {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.items.length,
      };

      await this.cacheManager.set(cacheKey, stats, 3600000);

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get book stats: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get book stats: ${error.message}`,
      );
    }
  }

  private async invalidateBookReviewsCache(bookId: string): Promise<void> {
    try {
      const cacheStore =
        (this.cacheManager as any).store || (this.cacheManager as any).stores;

      if (!cacheStore || typeof cacheStore.keys !== 'function') {
        this.logger.warn(
          'Cache store not available or does not support keys method',
        );
        return;
      }

      const reviewKeys = await cacheStore.keys(`reviews:book:${bookId}:*`);
      const statsKey = `reviews:stats:${bookId}`;

      for (const key of [...reviewKeys, statsKey]) {
        await this.cacheManager.del(key);
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache: ${error.message}`,
        error.stack,
      );
    }
  }
}
