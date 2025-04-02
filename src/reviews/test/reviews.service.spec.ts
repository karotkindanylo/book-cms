import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from '../reviews.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateReviewInput } from '../../reviews/dto/review.dto';
import { Review } from '../dto/review.model';

const mockDynamoClient = {
  send: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: 'DYNAMO_CLIENT', useValue: mockDynamoClient },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addReview', () => {
    it('should add a review successfully', async () => {
      const reviewInput = {
        book_id: 'book123',
        rating: 5,
        comment: 'Great book!',
      };
      const user_id = 'user123';

      const mockReview = {
        book_id: reviewInput.book_id,
        user_id,
        rating: reviewInput.rating,
        comment: reviewInput.comment,
      };

      jest.spyOn(service, 'getUserBookReview').mockResolvedValue([]);
      mockDynamoClient.send.mockResolvedValue({});

      const result = await service.addReview(reviewInput, user_id);

      expect(result).toEqual(expect.objectContaining(mockReview));
      expect(result.review_id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(mockDynamoClient.send).toHaveBeenCalled();
    });

    it('should throw error if rating is invalid', async () => {
      await expect(
        service.addReview(
          { book_id: 'book123', rating: 6, comment: 'Bad' },
          'user123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateReview', () => {
    it('should update a review successfully', async () => {
      const review_id = 'review123';
      const updateInput: UpdateReviewInput = { book_id: 'book123', rating: 5 };
      const user_id = 'user123';
      const mockReview: Review = {
        book_id: 'book123',
        review_id,
        user_id,
        rating: 4,
        comment: 'Good book!',
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(service, 'getReviewById').mockResolvedValue(mockReview);
      mockDynamoClient.send.mockResolvedValue({
        Attributes: { ...mockReview, rating: 5 },
      });

      const result = await service.updateReview(
        review_id,
        updateInput,
        user_id,
      );

      expect(result.rating).toBe(5);
      expect(mockDynamoClient.send).toHaveBeenCalled();
    });
  });

  describe('deleteReview', () => {
    it('should delete a review successfully', async () => {
      const review_id = 'review123';
      const user_id = 'user123';
      const mockReview: Review = {
        book_id: 'book123',
        review_id,
        user_id,
        rating: 4,
        comment: 'Nice book',
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(service, 'getReviewById').mockResolvedValue(mockReview);
      mockDynamoClient.send.mockResolvedValue({});

      const result = await service.deleteReview('book123', review_id, user_id);

      expect(result).toBe(true);
      expect(mockDynamoClient.send).toHaveBeenCalled();
    });
  });

  describe('getReviews', () => {
    it('should return reviews from cache if available', async () => {
      const mockReviews = {
        items: [
          {
            book_id: 'book123',
            review_id: 'review123',
            user_id: 'user123',
            rating: 5,
            comment: 'Amazing!',
            timestamp: new Date().toISOString(),
          },
        ],
        count: 1,
      };
      mockCacheManager.get.mockResolvedValue(mockReviews);

      const result = await service.getReviews('book123');

      expect(result).toEqual(mockReviews);
      expect(mockCacheManager.get).toHaveBeenCalled();
    });
  });
});
