import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { BooksModule } from './books/books.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLoggerInterceptor } from './common';
import { ReviewsModule } from './reviews/reviews.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { DynamoDBModule } from './dynamodb/dynamodb.module';
import { CacheConfigModule } from './cache/cache.module';
import { typeOrmConfig } from './database/typeorm.config';
import { ApolloDriver } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    BooksModule,
    AuthModule,
    UsersModule,
    ActivityLogModule,
    ReviewsModule,
    DynamoDBModule,
    CacheConfigModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggerInterceptor,
    },
  ],
})
export class AppModule {}
