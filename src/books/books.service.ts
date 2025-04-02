import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import {
  CreateBookDto,
  UpdateBookDto,
  BookSearchParams,
  PaginatedResult,
} from './dto/book.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  buildBookSearchConditions,
  buildPaginationOptions,
  buildSortOptions,
} from './books.utils';
import { ReviewsService } from '../reviews/reviews.service';
import { Review } from '../reviews/dto/review.model';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private activityLogService: ActivityLogService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async create(input: CreateBookDto, userId?: string): Promise<Book> {
    try {
      const data = {
        ...input,
        publicationDate: new Date(),
        publisher: userId,
      };
      const book = this.bookRepository.create(data);
      const result = await this.bookRepository.save(book);

      if (userId) {
        await this.activityLogService.log(
          userId,
          'CREATE_BOOK',
          `Created book: ${result.id} - ${result.title}`,
        );
      }

      await this.invalidateBooksCache();

      return result;
    } catch (error) {
      this.logger.error(`Failed to create book: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create book: ${error.message}`);
    }
  }

  async findOne(
    id: string,
  ): Promise<Book & { items: Review[]; count: number; nextToken?: string }> {
    try {
      const cacheKey = `books:${id}`;
      const cachedBook = await this.cacheManager.get<
        Book & { items: Review[]; count: number; nextToken?: string }
      >(cacheKey);

      if (cachedBook) {
        cachedBook.publicationDate = new Date(cachedBook.publicationDate);
        this.logger.log(`Cache hit for ${cacheKey}`);
        return cachedBook;
      }

      const book = await this.bookRepository.findOne({ where: { id } });

      if (!book) {
        throw new NotFoundException(`Book with ID ${id} not found`);
      }
      const reviews = await this.reviewsService.getReviews(book.id);
      const bookWithReviews: Book & {
        items: Review[];
        count: number;
        nextToken?: string;
      } = {
        ...book,
        ...reviews,
      };

      await this.cacheManager.set(cacheKey, bookWithReviews, 600000);

      return bookWithReviews;
    } catch (error) {
      this.logger.error(
        `Failed to fetch book ID ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to fetch book: ${error.message}`);
    }
  }

  async update(
    id: string,
    updateData: UpdateBookDto,
    userId: string,
  ): Promise<Book> {
    try {
      const book = await this.findOne(id);
      if (book.publisher !== userId) {
        throw new ForbiddenException('You can only update your own books.');
      }

      const updatedBook = this.bookRepository.merge(book, updateData);
      const result = await this.bookRepository.save(updatedBook);

      if (userId) {
        await this.activityLogService.log(
          userId,
          'UPDATE_BOOK',
          `Updated book: ${result.id} - ${result.title}`,
        );
      }

      await this.cacheManager.del(`books:${id}`);
      await this.invalidateBooksCache();

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update book ID ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to update book: ${error.message}`);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const book = await this.findOne(id);
      if (book.publisher !== userId) {
        throw new ForbiddenException('You can only remove your own books.');
      }
      await this.bookRepository.remove(book);

      if (userId) {
        await this.activityLogService.log(
          userId,
          'DELETE_BOOK',
          `Deleted book: ${id} - ${book.title}`,
        );
      }

      await this.cacheManager.del(`books:${id}`);
      await this.invalidateBooksCache();
    } catch (error) {
      this.logger.error(
        `Failed to delete book ID ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to delete book: ${error.message}`);
    }
  }

  async search(params: BookSearchParams): Promise<PaginatedResult<Book>> {
    if (params.page && params.page < 1)
      throw new BadRequestException('Page must be greater than 0');
    if (params.limit && (params.limit < 1 || params.limit > 100))
      throw new BadRequestException('Limit must be between 1 and 100');

    try {
      const cacheKey = `books:search:${JSON.stringify(params)}`;
      const cachedResult =
        await this.cacheManager.get<PaginatedResult<Book>>(cacheKey);

      if (cachedResult) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return cachedResult;
      }

      const allowedSortFields = [
        'id',
        'title',
        'author',
        'publicationDate',
        'createdAt',
      ];
      const whereConditions = buildBookSearchConditions<Book>(params);
      const { skip, take } = buildPaginationOptions(params);
      const order = buildSortOptions(params, allowedSortFields);

      const [items, total] = await this.bookRepository.findAndCount({
        where: whereConditions,
        skip,
        take,
        order,
      });

      const result = {
        items,
        total,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: Math.ceil(total / (params.limit || 10)),
      };

      await this.cacheManager.set(cacheKey, result, 300000);

      return result;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Book search failed: ${error.message}`);
    }
  }

  async invalidateBooksCache(): Promise<void> {
    try {
      const cacheStore =
        (this.cacheManager as any).store || (this.cacheManager as any).stores;

      if (!cacheStore || typeof cacheStore.keys !== 'function') {
        this.logger.warn(
          'Cache store not available or does not support keys method',
        );
        return;
      }

      const keys = await cacheStore.keys('books:list:*');
      const searchKeys = await cacheStore.keys('books:search:*');

      for (const key of [...keys, ...searchKeys]) {
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
