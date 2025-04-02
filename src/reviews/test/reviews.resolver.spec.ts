import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsResolver } from '../reviews.resolver';
import { ReviewsService } from '../reviews.service';
import { Review, PaginatedReviews, BookReviewStats } from '../dto/review.model';
import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewPaginationParams,
} from '../dto/review.dto';

jest.mock('../reviews.service');

describe('ReviewsResolver', () => {
  let resolver: ReviewsResolver;
  let service: ReviewsService;

  const mockContext = {
    req: {
      user: { userId: 'userId123' },
    },
  };

  const mockReview: Review = {
    book_id: 'bookId123',
    review_id: 'reviewId123',
    user_id: 'userId123',
    rating: 5,
    comment: 'Great book!',
    timestamp: new Date().toISOString(),
  };

  const mockPaginatedReviews: PaginatedReviews = {
    items: [mockReview],
    count: 1,
    nextToken: 'nextToken123',
  };

  const mockBookReviewStats: BookReviewStats = {
    averageRating: 4.5,
    totalReviews: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsResolver,
        {
          provide: ReviewsService,
          useValue: {
            addReview: jest.fn(),
            updateReview: jest.fn(),
            deleteReview: jest.fn(),
            getReviews: jest.fn(),
            getUserReviews: jest.fn(),
            getReviewById: jest.fn(),
            getBookStats: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<ReviewsResolver>(ReviewsResolver);
    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('createReview', () => {
    it('should create a new review', async () => {
      const createReviewInput: CreateReviewInput = {
        book_id: 'bookId123',
        rating: 5,
        comment: 'Great book!',
      };
      jest.spyOn(service, 'addReview').mockResolvedValue(mockReview);

      const result = await resolver.createReview(
        createReviewInput,
        mockContext,
      );
      expect(result).toEqual(mockReview);
      expect(service.addReview).toHaveBeenCalledWith(
        createReviewInput,
        'userId123',
      );
    });
  });

  describe('updateReview', () => {
    it('should update an existing review', async () => {
      const updateReviewInput: UpdateReviewInput = {
        book_id: 'bookId123',
        rating: 4,
        comment: 'Good book!',
      };
      jest.spyOn(service, 'updateReview').mockResolvedValue(mockReview);

      const result = await resolver.updateReview(
        'reviewId123',
        updateReviewInput,
        mockContext,
      );
      expect(result).toEqual(mockReview);
      expect(service.updateReview).toHaveBeenCalledWith(
        'reviewId123',
        updateReviewInput,
        'userId123',
      );
    });
  });

  describe('deleteReview', () => {
    it('should delete an existing review', async () => {
      jest.spyOn(service, 'deleteReview').mockResolvedValue(true);

      const result = await resolver.deleteReview(
        'bookId123',
        'reviewId123',
        mockContext,
      );
      expect(result).toBe(true);
      expect(service.deleteReview).toHaveBeenCalledWith(
        'bookId123',
        'reviewId123',
        'userId123',
      );
    });
  });

  describe('getBookReviews', () => {
    it('should return paginated reviews for a book', async () => {
      const params: ReviewPaginationParams = { limit: 10, nextToken: 'token' };
      jest.spyOn(service, 'getReviews').mockResolvedValue(mockPaginatedReviews);

      const result = await resolver.getBookReviews('bookId123', params);
      expect(result).toEqual(mockPaginatedReviews);
      expect(service.getReviews).toHaveBeenCalledWith('bookId123', params);
    });
  });

  describe('getMyReviews', () => {
    it('should return paginated reviews for the current user', async () => {
      const params: ReviewPaginationParams = { limit: 10 };
      jest
        .spyOn(service, 'getUserReviews')
        .mockResolvedValue(mockPaginatedReviews);

      const result = await resolver.getMyReviews(mockContext, params);
      expect(result).toEqual(mockPaginatedReviews);
      expect(service.getUserReviews).toHaveBeenCalledWith('userId123', params);
    });
  });

  describe('getBookReviewStats', () => {
    it('should return review stats for a book', async () => {
      jest
        .spyOn(service, 'getBookStats')
        .mockResolvedValue(mockBookReviewStats);

      const result = await resolver.getBookReviewStats('bookId123');
      expect(result).toEqual(mockBookReviewStats);
      expect(service.getBookStats).toHaveBeenCalledWith('bookId123');
    });
  });
});
