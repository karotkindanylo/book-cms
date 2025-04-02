import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from '../src/books/books.service';
import { BooksResolver } from '../src/books/books.resolver';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from '../src/books/entities/book.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ActivityLogService } from '../src/activity-log/activity-log.service';
import { ReviewsService } from '../src/reviews/reviews.service';

describe('BooksService (e2e)', () => {
  let service: BooksService;
  let repository: jest.Mocked<Repository<Book>>;
  let cacheManager: Cache;
  let activityLogService: ActivityLogService;
  let reviewsService: ReviewsService;

  beforeEach(async () => {
    const repositoryMock: jest.Mocked<Partial<Repository<Book>>> = {
      create: jest.fn().mockImplementation((dto) => ({ id: '1', ...dto })),
      save: jest.fn(),
      merge: jest.fn().mockImplementation((_, dto) => dto),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        BooksResolver,
        {
          provide: getRepositoryToken(Book),
          useValue: repositoryMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        {
          provide: ActivityLogService,
          useValue: { log: jest.fn() },
        },
        {
          provide: ReviewsService, // Добавляем мок сервиса отзывов
          useValue: {
            findReviewsForBook: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    repository = module.get(getRepositoryToken(Book));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    activityLogService = module.get<ActivityLogService>(ActivityLogService);
    reviewsService = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBook', () => {
    it('should create a book successfully', async () => {
      const userId = 'user-123';
      const bookData = {
        title: 'Example Book',
        author: 'John Doe',
      };
      const book = {
        id: '1',
        ...bookData,
        publicationDate: expect.any(Date),
        publisher: userId,
      };

      repository.save.mockResolvedValue(book);
      jest.spyOn(service, 'invalidateBooksCache').mockResolvedValue(undefined);

      const result = await service.create(bookData, userId); // Передаем userId
      expect(result).toEqual(book);
    });
  });
});
