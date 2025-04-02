import { Field, InputType, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateReviewInput {
  @Field()
  @IsString()
  book_id: string;

  @Field(() => Int)
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @Field()
  @IsString()
  comment: string;
}

@InputType()
export class UpdateReviewInput {
  @Field()
  @IsString()
  book_id: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  comment?: string;
}

@InputType()
export class ReviewPaginationParams {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  nextToken?: string;
}
