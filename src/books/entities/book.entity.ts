import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@ObjectType()
@Entity()
export class Book {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  author: string;

  @Field({ nullable: true })
  @Column()
  publicationDate: Date;

  @Field()
  @Column()
  publisher: string;
}
