import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Book } from '../entities/book.entity';
import { Review } from '../../reviews/dto/review.model';

@InputType()
export class CreateBookDto {
  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  author: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  isbn?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}

@InputType()
export class UpdateBookDto {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  title?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  author?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  publicationDate?: Date;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  isbn?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

@InputType()
export class PaginationParams {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @Field({ nullable: true, defaultValue: 'id' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @Field(() => String, { nullable: true, defaultValue: 'ASC' })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}

@InputType()
export class BookSearchParams extends PaginationParams {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  title?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  author?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  toDate?: string;
}

@ObjectType()
export class PaginatedBookResult {
  @Field(() => [Book])
  items: Book[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class BookWithReviews extends Book {
  @Field(() => [Review], { nullable: true })
  items?: Review[];

  @Field(() => Number, { nullable: true })
  count?: number;

  @Field(() => String, { nullable: true })
  nextToken?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
