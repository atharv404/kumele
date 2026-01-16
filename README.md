# Kumele Backend API

A social meetup/hobby matching application backend - "Tinder for events"

## 🚀 Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **ORM**: Prisma
- **Authentication**: JWT + Google OAuth + WebAuthn (Passkeys)
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/atharv404/kumele.git
cd kumele
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Docker services (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 5. Run database migrations

```bash
npx prisma migrate dev
```

### 6. Generate Prisma Client

```bash
npx prisma generate
```

### 7. Start the development server

```bash
npm run start:dev
```

## 📚 API Documentation

Once the server is running, access the Swagger documentation at:

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

## 🔐 Authentication

The API supports multiple authentication methods:

### 1. Email/Password
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login with email/password

### 2. Google OAuth
- `GET /api/v1/auth/google` - Initiate Google OAuth flow

### 3. Passkeys (WebAuthn)
- `POST /api/v1/auth/passkey/register/start` - Start passkey registration
- `POST /api/v1/auth/passkey/register/finish` - Complete registration
- `POST /api/v1/auth/passkey/login/start` - Start passkey login
- `POST /api/v1/auth/passkey/login/finish` - Complete login

### Token Management
- Access Token: 15 minutes TTL
- Refresh Token: 30 days TTL
- `POST /api/v1/auth/refresh` - Refresh tokens
- `POST /api/v1/auth/logout` - Logout current session

## 🗄️ Database

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create a migration
npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database (dev only)
npx prisma migrate reset
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🐳 Docker

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Build

```bash
# Build image
docker build -t kumele-api .

# Run container
docker run -p 3000:3000 --env-file .env kumele-api
```

## 📁 Project Structure

```
kumele/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── common/                 # Shared utilities
│   │   ├── decorators/         # Custom decorators
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth guards
│   │   └── interceptors/       # Response interceptors
│   ├── config/                 # Configuration
│   ├── modules/                # Feature modules
│   │   ├── auth/               # Authentication
│   │   ├── users/              # User management
│   │   ├── health/             # Health checks
│   │   ├── events/             # Event management
│   │   ├── payments/           # Payments (Stripe/PayPal)
│   │   ├── chat/               # Real-time chat
│   │   ├── blogs/              # Blog posts
│   │   ├── notifications/      # Push notifications
│   │   └── ads/                # Advertisement system
│   └── prisma/                 # Prisma service
├── prisma/
│   └── schema.prisma           # Database schema
├── test/                       # E2E tests
├── docker-compose.yml          # Docker services
├── Dockerfile                  # Production build
└── package.json
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `APP_PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection | - |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_ACCESS_SECRET` | JWT access token secret | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | - |
| `WEBAUTHN_RP_ID` | WebAuthn Relying Party ID | localhost |

See `.env.example` for full list.

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/users/profile"
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/auth/signup",
  "errors": {
    "email": ["Please provide a valid email address"]
  }
}
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## 📄 License

ISC
