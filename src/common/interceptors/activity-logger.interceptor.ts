import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';
import { ActivityLogService } from '../../activity-log/activity-log.service';

@Injectable()
export class ActivityLoggerInterceptor implements NestInterceptor {
  constructor(private readonly activityLogService: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();
    const req = ctx.req;

    if (!req) {
      console.error('Request object is undefined');
      return next.handle();
    }

    const user = req.user;
    if (!user) {
      console.error('User is not authenticated');
      return next.handle();
    }

    const resolverInfo = gqlContext.getInfo();
    const operationName = resolverInfo.fieldName;
    const args = gqlContext.getArgs();

    if (!resolverInfo || !resolverInfo.operation) {
      console.error(
        'Error: resolverInfo or resolverInfo.operation is undefined.',
      );
      return next.handle();
    }

    const isMutation = resolverInfo.operation.operation === 'mutation';
    const isQuery = resolverInfo.operation.operation === 'query';

    if (isQuery || isMutation) {
      const sanitizedArgs = JSON.parse(JSON.stringify(args));
      this.maskSensitiveFields(sanitizedArgs);

      return next.handle().pipe(
        tap(async () => {
          await this.activityLogService.log(
            user.userId,
            `${resolverInfo.operation.operation}:${operationName}`,
            `Payload: ${JSON.stringify(sanitizedArgs)}`,
          );
        }),
      );
    } else {
      return next.handle();
    }
  }

  private maskSensitiveFields(obj: any) {
    const sensitiveKeys = ['password', 'newPassword', 'confirmPassword'];
    for (const key in obj) {
      if (sensitiveKeys.includes(key)) {
        obj[key] = '***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.maskSensitiveFields(obj[key]);
      }
    }
  }
}
