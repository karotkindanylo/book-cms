import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
export class ActivityLog {
  @Field()
  id: string;

  @Field()
  user_id: string;

  @Field()
  timestamp: string;

  @Field()
  action: string;

  @Field()
  details: string;
}

@ObjectType()
export class PaginatedActivityLogs {
  @Field(() => [ActivityLog])
  items: ActivityLog[];

  @Field(() => Int)
  count: number;

  @Field({ nullable: true })
  nextToken?: string;
}
