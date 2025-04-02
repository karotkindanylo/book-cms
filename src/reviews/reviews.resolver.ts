import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { Review, PaginatedReviews, BookReviewStats } from './dto/review.model';
import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewPaginationParams,
} from './dto/review.dto';

@Resolver(() => Review)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Mutation(() => Review)
  @UseGuards(JwtAuthGuard)
  createReview(@Args('input') input: CreateReviewInput, @Context() context) {
    const userId = context.req.user.userId;
    return this.reviewsService.addReview(input, userId);
  }

  @Mutation(() => Review)
  @UseGuards(JwtAuthGuard)
  updateReview(
    @Args('reviewId') reviewId: string,
    @Args('input') input: UpdateReviewInput,
    @Context() context,
  ) {
    const userId = context.req.user.userId;
    return this.reviewsService.updateReview(reviewId, input, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteReview(
    @Args('bookId') bookId: string,
    @Args('reviewId') reviewId: string,
    @Context() context,
  ) {
    const userId = context.req.user.userId;
    return this.reviewsService.deleteReview(bookId, reviewId, userId);
  }

  @Query(() => PaginatedReviews)
  getBookReviews(
    @Args('bookId') bookId: string,
    @Args('params', { nullable: true }) params?: ReviewPaginationParams,
  ) {
    return this.reviewsService.getReviews(bookId, params);
  }

  @Query(() => PaginatedReviews)
  @UseGuards(JwtAuthGuard)
  getMyReviews(
    @Context() context,
    @Args('params', { nullable: true }) params?: ReviewPaginationParams,
  ) {
    const userId = context.req.user.userId;
    return this.reviewsService.getUserReviews(userId, params);
  }

  @Query(() => BookReviewStats)
  getBookReviewStats(@Args('bookId') bookId: string) {
    return this.reviewsService.getBookStats(bookId);
  }
}
