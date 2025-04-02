import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from '../books.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { Book } from '../entities/book.entity';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from '../../reviews/reviews.service';

const mockBookRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  merge: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  }),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockActivityLogService = {
  log: jest.fn(),
};

const mockReviewsService = {
  getReviews: jest.fn(),
};

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getRepositoryToken(Book),
          useValue: mockBookRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a book', async () => {
      const bookData = {
        title: 'New Title',
        author: 'John Doe',
        publicationDate: new Date(),
      };
      const savedBook = { id: '1', ...bookData };

      mockBookRepository.create.mockReturnValue(savedBook);
      mockBookRepository.save.mockResolvedValue(savedBook);

      const result = await service.create(bookData);

      expect(mockBookRepository.create).toHaveBeenCalledWith(bookData);
      expect(mockBookRepository.save).toHaveBeenCalledWith(savedBook);
      expect(result).toEqual(savedBook);
    });
  });

  describe('findOne', () => {
    it('should return a book from cache if available', async () => {
      const cachedBook = {
        id: '1',
        title: 'Cached Book',
        publicationDate: new Date(),
        items: [{ id: 'r1', rating: 5, comment: 'Cached review' }],
        count: 1,
      };

      mockCacheManager.get.mockResolvedValue(cachedBook);

      const result = await service.findOne('1');

      expect(result).toEqual(cachedBook);
      expect(mockCacheManager.get).toHaveBeenCalledWith('books:1');
      expect(mockBookRepository.findOne).not.toHaveBeenCalled();
      expect(mockReviewsService.getReviews).not.toHaveBeenCalled();
    });

    it('should return a book from repository and cache if not found in cache', async () => {
      const book = { id: '1', title: 'Test Book', publicationDate: new Date() };
      const reviews = {
        items: [{ id: 'r1', rating: 5, comment: 'Great book!' }],
        count: 1,
      };
      const bookWithReviews = { ...book, ...reviews };

      mockCacheManager.get.mockResolvedValue(null);
      mockBookRepository.findOne.mockResolvedValue(book);
      mockReviewsService.getReviews.mockResolvedValue(reviews);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.findOne('1');

      expect(result).toEqual(bookWithReviews);
      expect(mockCacheManager.get).toHaveBeenCalledWith('books:1');
      expect(mockBookRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockReviewsService.getReviews).toHaveBeenCalledWith('1');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'books:1',
        bookWithReviews,
        600000,
      );
    });

    it('should throw NotFoundException if book is not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockBookRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
      expect(mockBookRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('update', () => {
    it('should update and return the book', async () => {
      const userId = 'user123';

      const book = {
        id: '1',
        author: 'JohnDoe',
        title: 'Old Title',
        publisher: userId,
      };

      const updatedData = { title: 'New Title' };

      mockBookRepository.findOne.mockResolvedValue(book);

      mockBookRepository.save.mockResolvedValue({
        ...book,
        ...updatedData,
        publicationDate: new Date(),
      });

      const result = await service.update('1', updatedData, userId);

      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          title: 'New Title',
          author: expect.any(String),
          publicationDate: expect.any(Date),
        }),
      );

      expect(mockBookRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockBookRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'John Doe',
          id: '1',
          publicationDate: expect.any(Date),
          title: 'New Title',
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a book', async () => {
      const userId = 'user123';
      const book = { id: '1', title: 'Test Book', publisher: userId };

      mockBookRepository.findOne.mockResolvedValue(book);
      mockBookRepository.remove.mockResolvedValue(undefined);

      await service.remove('1', userId);

      expect(mockBookRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Test Book',
          publisher: userId,
        }),
      );
    });

    it('should throw NotFoundException if book does not exist', async () => {
      mockBookRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('1', 'user123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should return paginated search results', async () => {
      const books = [{ id: '1', title: 'Book One' }];
      mockBookRepository.findAndCount.mockResolvedValue([books, 1]);

      const result = await service.search({ title: 'Book' });

      expect(result.items).toEqual(books);
      expect(result.total).toBe(1);
      expect(mockBookRepository.findAndCount).toHaveBeenCalled();
    });
  });
});
