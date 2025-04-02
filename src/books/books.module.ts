import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksResolver } from './books.resolver';
import { Book } from './entities/book.entity';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
import { DynamoDBModule } from 'src/dynamodb/dynamodb.module';
import { ReviewsService } from 'src/reviews/reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book]), DynamoDBModule],
  providers: [BooksService, BooksResolver, ActivityLogService, ReviewsService],
})
export class BooksModule {}
