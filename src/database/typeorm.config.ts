import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Book } from '../books/entities/book.entity';
import * as dotenv from 'dotenv';
import { User } from 'src/users/entities/user.entity';

dotenv.config();

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Book, User],
  synchronize: true,
};
