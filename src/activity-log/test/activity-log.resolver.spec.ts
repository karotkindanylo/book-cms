import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogResolver } from '../activity-log.resolver';
import { ActivityLogService } from '../activity-log.service';
import { PaginatedActivityLogs, ActivityLog } from '../dto/activity.model';
import { ActivityLogParams } from '../dto/activity-log.dto';

jest.mock('../activity-log.service');

describe('ActivityLogResolver', () => {
  let resolver: ActivityLogResolver;
  let service: ActivityLogService;

  const mockContext = {
    req: {
      user: { userId: 'userId123' },
    },
  };

  const mockActivityLog: ActivityLog = {
    id: '1',
    user_id: 'userId123',
    timestamp: new Date().toISOString(),
    action: 'login',
    details: 'User logged in successfully',
  };

  const mockPaginatedActivityLogs: PaginatedActivityLogs = {
    items: [mockActivityLog],
    count: 1,
    nextToken: 'nextToken123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogResolver,
        {
          provide: ActivityLogService,
          useValue: {
            getUserActivityLogs: jest.fn(),
            getRecentActivityLogs: jest.fn(),
            getActivityLogsByAction: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<ActivityLogResolver>(ActivityLogResolver);
    service = module.get<ActivityLogService>(ActivityLogService);
  });

  describe('myActivityLogs', () => {
    it('should return paginated activity logs for the user', async () => {
      jest
        .spyOn(service, 'getUserActivityLogs')
        .mockResolvedValue(mockPaginatedActivityLogs);

      const params: ActivityLogParams = { limit: 10, nextToken: 'token' };
      const result = await resolver.myActivityLogs(mockContext, params);
      expect(result).toEqual(mockPaginatedActivityLogs);
      expect(service.getUserActivityLogs).toHaveBeenCalledWith(
        'userId123',
        params,
      );
    });
  });

  describe('recentActivityLogs', () => {
    it('should return recent activity logs', async () => {
      jest
        .spyOn(service, 'getRecentActivityLogs')
        .mockResolvedValue(mockPaginatedActivityLogs);

      const params: ActivityLogParams = { limit: 10 };
      const result = await resolver.recentActivityLogs(params);
      expect(result).toEqual(mockPaginatedActivityLogs);
      expect(service.getRecentActivityLogs).toHaveBeenCalledWith(params);
    });
  });

  describe('activityLogsByAction', () => {
    it('should return activity logs filtered by action', async () => {
      jest
        .spyOn(service, 'getActivityLogsByAction')
        .mockResolvedValue(mockPaginatedActivityLogs);

      const params: ActivityLogParams = { limit: 10 };
      const result = await resolver.activityLogsByAction('login', params);
      expect(result).toEqual(mockPaginatedActivityLogs);
      expect(service.getActivityLogsByAction).toHaveBeenCalledWith(
        'login',
        params,
      );
    });
  });
});
