import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import {
  CreateBookDto,
  UpdateBookDto,
  BookSearchParams,
  PaginatedBookResult,
  BookWithReviews,
} from './dto/book.dto';
import { Review } from '../reviews/dto/review.model';

@Resolver(() => Book)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Mutation(() => Book)
  @UseGuards(JwtAuthGuard)
  createBook(
    @Args('input') input: CreateBookDto,
    @Context() context,
  ): Promise<Book> {
    const userId = context.req.user?.userId;
    return this.booksService.create(input, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteBook(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user?.userId;
    await this.booksService.remove(id, userId);
    return true;
  }

  @Query(() => BookWithReviews)
  async book(
    @Args('id') id: string,
  ): Promise<Book & { items: Review[]; count: number; nextToken?: string }> {
    return this.booksService.findOne(id);
  }

  @Mutation(() => Book)
  @UseGuards(JwtAuthGuard)
  async updateBook(
    @Args('id') id: string,
    @Args('input') input: UpdateBookDto,
    @Context() context: any,
  ): Promise<Book> {
    const userId = context.req.user?.userId;
    return this.booksService.update(id, input, userId);
  }

  @Query(() => PaginatedBookResult)
  @UseGuards(JwtAuthGuard)
  async searchBooks(
    @Args('params') params: BookSearchParams,
  ): Promise<PaginatedBookResult> {
    return this.booksService.search(params);
  }
}
