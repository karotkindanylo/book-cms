import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from '../activity-log.service';
import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const mockDynamoClient = {
  send: jest.fn(),
};

describe('ActivityLogService', () => {
  let service: ActivityLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        { provide: 'DYNAMO_CLIENT', useValue: mockDynamoClient },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log an activity', async () => {
    mockDynamoClient.send.mockResolvedValueOnce({});
    const userId = 'user123';
    const action = 'LOGIN';
    const details = 'User logged in';

    const result = await service.log(userId, action, details);

    expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
    expect(result).toMatchObject({ user_id: userId, action, details });
  });

  it('should get user activity logs', async () => {
    const mockData = {
      Items: [{ id: '1', user_id: 'user123', action: 'LOGIN' }],
    };
    mockDynamoClient.send.mockResolvedValueOnce(mockData);

    const result = await service.getUserActivityLogs('user123', { limit: 10 });

    expect(mockDynamoClient.send).toHaveBeenCalledWith(
      expect.any(QueryCommand),
    );
    expect(result.items).toHaveLength(1);
  });

  it('should get activity logs by action', async () => {
    const mockData = {
      Items: [{ id: '1', user_id: 'user123', action: 'LOGIN' }],
    };
    mockDynamoClient.send.mockResolvedValueOnce(mockData);

    const result = await service.getActivityLogsByAction('LOGIN', {
      limit: 10,
    });

    expect(mockDynamoClient.send).toHaveBeenCalledWith(
      expect.any(QueryCommand),
    );
    expect(result.items).toHaveLength(1);
  });

  it('should get recent activity logs', async () => {
    const mockData = {
      Items: [
        {
          id: '1',
          user_id: 'user123',
          action: 'LOGIN',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    mockDynamoClient.send.mockResolvedValueOnce(mockData);

    const result = await service.getRecentActivityLogs({ limit: 10 });

    expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(ScanCommand));
    expect(result.items).toHaveLength(1);
  });
});
