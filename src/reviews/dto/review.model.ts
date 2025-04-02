import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class Review {
  @Field()
  book_id: string;

  @Field()
  review_id: string;

  @Field()
  user_id: string;

  @Field(() => Int)
  rating: number;

  @Field()
  comment: string;

  @Field()
  timestamp: string;
}

@ObjectType()
export class PaginatedReviews {
  @Field(() => [Review])
  items: Review[];

  @Field(() => Int)
  count: number;

  @Field({ nullable: true })
  nextToken?: string;
}

@ObjectType()
export class BookReviewStats {
  @Field(() => Float)
  averageRating: number;

  @Field(() => Int)
  totalReviews: number;
}
