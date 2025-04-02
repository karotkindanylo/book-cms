import { Test, TestingModule } from '@nestjs/testing';
import { BooksResolver } from '../books.resolver';
import { BooksService } from '../books.service';
import {
  BookSearchParams,
  CreateBookDto,
  UpdateBookDto,
} from '../dto/book.dto';

describe('BooksResolver', () => {
  let resolver: BooksResolver;
  let service: BooksService;

  const mockBooksService = {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    search: jest.fn(),
    getStatistics: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksResolver,
        {
          provide: BooksService,
          useValue: mockBooksService,
        },
      ],
    }).compile();

    resolver = module.get<BooksResolver>(BooksResolver);
    service = module.get<BooksService>(BooksService);
  });

  describe('createBook', () => {
    it('should create a book successfully', async () => {
      const createBookDto: CreateBookDto = {
        title: 'Test Book',
        author: 'Test Author',
      };
      const createdBook = { ...createBookDto, id: '123' };

      mockBooksService.create.mockResolvedValue(createdBook);

      const result = await resolver.createBook(createBookDto, {
        req: { user: { userId: 'user1' } },
      });

      expect(result).toEqual(createdBook);
      expect(mockBooksService.create).toHaveBeenCalledWith(
        createBookDto,
        'user1',
      );
    });

    it('should throw error if creation fails', async () => {
      const createBookDto: CreateBookDto = {
        title: 'Test Book',
        author: 'Test Author',
      };

      mockBooksService.create.mockRejectedValue(
        new Error('Failed to create book'),
      );

      try {
        await resolver.createBook(createBookDto, {
          req: { user: { userId: 'user1' } },
        });
      } catch (error) {
        expect(error.message).toBe('Failed to create book');
      }
    });
  });

  describe('updateBook', () => {
    it('should update a book successfully', async () => {
      const updateBookDto: UpdateBookDto = { title: 'Updated Title' };
      const updatedBook = {
        ...updateBookDto,
        id: '123',
        author: 'Test Author',
        publicationDate: new Date(),
      };

      mockBooksService.update.mockResolvedValue(updatedBook);

      const result = await resolver.updateBook('123', updateBookDto, {
        req: { user: { userId: 'user1' } },
      });

      expect(result).toEqual(updatedBook);
      expect(mockBooksService.update).toHaveBeenCalledWith(
        '123',
        updateBookDto,
        'user1',
      );
    });

    it('should throw error if update fails', async () => {
      const updateBookDto: UpdateBookDto = { title: 'Updated Title' };

      mockBooksService.update.mockRejectedValue(
        new Error('Failed to update book'),
      );

      try {
        await resolver.updateBook('123', updateBookDto, {
          req: { user: { userId: 'user1' } },
        });
      } catch (error) {
        expect(error.message).toBe('Failed to update book');
      }
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully', async () => {
      mockBooksService.remove.mockResolvedValue(undefined);

      const result = await resolver.deleteBook('123', {
        req: { user: { userId: 'user1' } },
      });

      expect(result).toBe(true);
      expect(mockBooksService.remove).toHaveBeenCalledWith('123', 'user1');
    });

    it('should throw error if delete fails', async () => {
      mockBooksService.remove.mockRejectedValue(
        new Error('Failed to delete book'),
      );

      try {
        await resolver.deleteBook('123', {
          req: { user: { userId: 'user1' } },
        });
      } catch (error) {
        expect(error.message).toBe('Failed to delete book');
      }
    });
  });

  describe('book', () => {
    it('should return a single book with reviews', async () => {
      const bookWithReviews = {
        id: '123',
        title: 'Test Book',
        author: 'Test Author',
        items: [
          { id: '1', rating: 5, comment: 'Great book!', userId: 'user1' },
          { id: '2', rating: 4, comment: 'Pretty good', userId: 'user2' },
        ],
        count: 2,
        nextToken: null,
      };

      mockBooksService.findOne.mockResolvedValue(bookWithReviews);

      const result = await resolver.book('123');

      expect(result).toEqual(bookWithReviews);
      expect(mockBooksService.findOne).toHaveBeenCalledWith('123');
    });
  });

  describe('searchBooks', () => {
    it('should return a list of books based on search parameters', async () => {
      const searchParams: BookSearchParams = {
        title: 'Test Book',
        author: 'Test Author',
        fromDate: '2021-01-01',
        toDate: '2022-01-01',
        page: 1,
        limit: 10,
      };

      const paginatedResult = { items: [], totalCount: 0 };
      mockBooksService.search.mockResolvedValue(paginatedResult);

      const result = await resolver.searchBooks(searchParams);

      expect(result).toEqual(paginatedResult);
      expect(mockBooksService.search).toHaveBeenCalledWith(searchParams);
    });
  });
});
