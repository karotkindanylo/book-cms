import { Resolver, Query, Args, Context, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';
import { ActivityLog, PaginatedActivityLogs } from './dto/activity.model';
import { ActivityLogParams } from './dto/activity-log.dto';

@Resolver(() => ActivityLog)
export class ActivityLogResolver {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Query(() => PaginatedActivityLogs)
  @UseGuards(JwtAuthGuard)
  async myActivityLogs(
    @Context() context,
    @Args('params', { nullable: true }) params?: ActivityLogParams,
  ): Promise<PaginatedActivityLogs> {
    const userId = context.req.user.userId;
    return this.activityLogService.getUserActivityLogs(userId, params);
  }

  @Query(() => PaginatedActivityLogs)
  @UseGuards(JwtAuthGuard)
  async recentActivityLogs(
    @Args('params', { nullable: true }) params?: ActivityLogParams,
  ): Promise<PaginatedActivityLogs> {
    return this.activityLogService.getRecentActivityLogs(params);
  }

  @Query(() => PaginatedActivityLogs)
  @UseGuards(JwtAuthGuard)
  async activityLogsByAction(
    @Args('action') action: string,
    @Args('params', { nullable: true }) params?: ActivityLogParams,
  ): Promise<PaginatedActivityLogs> {
    return this.activityLogService.getActivityLogsByAction(action, params);
  }
}
