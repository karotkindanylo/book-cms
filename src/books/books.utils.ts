import {
  FindOptionsWhere,
  ILike,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  In,
} from 'typeorm';

/**
 * Builds query conditions for searching books
 * @param params Search parameters
 * @returns TypeORM where conditions object
 */
export function buildBookSearchConditions<
  T extends {
    title?: any;
    author?: any;
    publicationDate?: any;
    genres?: any;
  },
>(params: {
  title?: string;
  author?: string;
  fromDate?: string;
  toDate?: string;
  genres?: string[];
  [key: string]: any;
}): FindOptionsWhere<T> {
  const whereConditions: FindOptionsWhere<T> = {};

  if (params.title) {
    (whereConditions as any).title = ILike(`%${params.title}%`);
  }

  if (params.author) {
    (whereConditions as any).author = ILike(`%${params.author}%`);
  }

  if (params.fromDate && params.toDate) {
    (whereConditions as any).publicationDate = Between(
      new Date(params.fromDate),
      new Date(params.toDate),
    );
  } else if (params.fromDate) {
    (whereConditions as any).publicationDate = MoreThanOrEqual(
      new Date(params.fromDate),
    );
  } else if (params.toDate) {
    (whereConditions as any).publicationDate = LessThanOrEqual(
      new Date(params.toDate),
    );
  }

  if (params.genres && params.genres.length > 0) {
    (whereConditions as any).genres = In(params.genres);
  }

  for (const [key, value] of Object.entries(params)) {
    if (
      [
        'title',
        'author',
        'fromDate',
        'toDate',
        'genres',
        'page',
        'limit',
        'sortBy',
        'sortOrder',
      ].includes(key) ||
      value === undefined
    ) {
      continue;
    }

    (whereConditions as any)[key] = value;
  }

  return whereConditions;
}

/**
 * Creates pagination parameters for TypeORM queries
 * @param options Pagination options
 * @returns Object with skip and take properties
 */
export function buildPaginationOptions(options: {
  page?: number;
  limit?: number;
}): { skip: number; take: number } {
  const page = options.page || 1;
  const limit = options.limit || 10;

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Creates sort options for TypeORM queries
 * @param options Sort options
 * @param allowedFields List of fields that can be sorted
 * @returns Sort options object
 */
export function buildSortOptions(
  options: { sortBy?: string; sortOrder?: 'ASC' | 'DESC' },
  allowedFields: string[] = [],
): Record<string, 'ASC' | 'DESC'> {
  const { sortBy = 'id', sortOrder = 'ASC' } = options;

  const field =
    allowedFields.length > 0 && !allowedFields.includes(sortBy) ? 'id' : sortBy;

  return { [field]: sortOrder };
}
