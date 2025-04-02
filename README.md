# Books Content Management System (CMS)

## Overview

This is a Books Content Management System (CMS) built using **NestJS, GraphQL, TypeOrm, PostgreSQL, Redis, DynamoDB, and AWS**. The system allows users to manage book information, handle large datasets efficiently, and ensure high availability and security.

## System Architecture

- **NestJS** for building the backend service.
- **GraphQL** for efficient data fetching and mutations.
- **PostgreSQL** for relational data (e.g., book details: title, author, publication date, etc.).
- **DynamoDB** for non-relational data (e.g., user activity logs and book reviews).
- **Redis** for caching and performance improvements.
- **JWT-based Authentication** for securing access.
- **Rate Limiting** to prevent API abuse.
- **AWS** for scalable and load-balanced deployment.

---

## Setup and Installation

### Prerequisites

- Node.js (>=16.x)
- PostgreSQL
- Redis
- AWS Account (for DynamoDB)

### Installation

1. Clone the repository:

   ```bash
   git clone git@github.com:karotkindanylo/book-cms.git
   cd book-cms
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## 3. Configure environment variables

Create a `.env` file in the root directory and provide the necessary configuration values:

```env
# Database configuration
DB_HOST=localhost            # Database host
DB_PORT=5432                 # Database port
DB_USERNAME=postgres         # Database username
DB_PASSWORD=root             # Database password
DB_NAME=bookscms             # Database name

# Redis configuration
REDIS_URL=redis://localhost:6379  # Redis connection URL

# JWT configuration
JWT_SECRET=your-jwt-secret        # Secret key for JWT authentication
JWT_EXPIRES_IN=3600s              # Token expiration time (e.g., 3600s = 1 hour)

# AWS configuration (for file storage, etc.)
AWS_ACCESS_KEY_ID=your-access-key      # AWS access key ID
AWS_SECRET_ACCESS_KEY=your-secret-key  # AWS secret access key
AWS_REGION=your-region                 # AWS region
```

4. Run database migrations:

   ```bash
   npm run migration:run
   ```

5. Start the application:

   ```bash
   npm run start
   ```

---

### Unit Tests

```bash
npm run test
```

### End-to-End (E2E) Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

To run the tests manually, refer to the `tests` folder and ensure all necessary services (PostgreSQL, Redis) are running.

---

## API Documentation

The API uses GraphQL. You can access the interactive GraphQL Playground at:

```
http://localhost:3000/graphql
```

### Example Query

```graphql
query {
  books {
    id
    title
    author
    publishedYear
  }
}
```

### Example Mutation

```graphql
mutation {
  addBook(
    input: { title: "New Book", author: "John Doe", publishedYear: 2024 }
  ) {
    id
    title
  }
}
```

---

## Deployment

### Local Deployment

To run the application locally with a PostgreSQL database:

```bash
npm run start:dev
```

### AWS Deployment

To deploy on AWS, follow these steps:

1. Configure AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
2. Use AWS DynamoDB for database storage.
3. Deploy the service:

   ```bash
   npm install -g aws-cli
   aws deploy
   ```

---

## Security Measures

- **JWT Authentication** to secure API endpoints.
- **Rate Limiting** to prevent excessive requests.
- **Input Validation** to prevent SQL injection and XSS attacks.
- **Proper Error Handling** to prevent information leaks.

---

## License

This project is licensed under the **MIT License**.

---
