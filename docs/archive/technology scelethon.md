# Next.js Production-Ready Application Boilerplate

## Overview
Generate a robust, production-ready Next.js application boilerplate with comprehensive features, modern architecture, and best practices.

## Core Technologies

- **Next.js 14+** with App Router
- **TypeScript** with strict mode
- **Prisma ORM** with PostgreSQL database
- **Docker & Docker Compose** for containerization
- **Shadcn/ui** for UI components
- **Zod** for schema validation
- **Tailwind CSS** for styling

## Project Structure & Architecture

### Directory Structure
```
project-root/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── (auth)/            # Auth group routes
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── loading.tsx        # Loading UI
│   │   ├── error.tsx          # Error UI
│   │   ├── not-found.tsx      # 404 page
│   │   └── page.tsx           # Home page
│   ├── components/             # Reusable UI components
│   │   ├── ui/                # Shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── forms/             # Form components
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   └── common/
│   │   ├── layout/            # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── navigation.tsx
│   │   └── providers/         # Context providers
│   ├── lib/                   # Utility functions
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── validations/       # Zod schemas
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   ├── utils.ts           # Helper functions
│   │   ├── constants.ts       # Application constants
│   │   └── config.ts          # App configuration
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-debounce.ts
│   │   └── use-api.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── api.ts
│   │   └── globals.ts
│   ├── store/                 # State management
│   │   ├── auth-store.ts
│   │   ├── theme-store.ts
│   │   └── user-store.ts
│   └── middleware.ts          # Next.js middleware
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   ├── seed.ts               # Database seed data
│   └── seeds/                # Seed data files
├── public/
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── docs/                      # Documentation
│   ├── api.md
│   ├── deployment.md
│   └── development.md
├── tests/                     # Test files
│   ├── __mocks__/
│   ├── components/
│   ├── pages/
│   └── utils/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── Dockerfile.prod
├── .env.example
├── .env.local
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Features to Implement

### Authentication & Security

- **JWT-based authentication** with refresh tokens
- **Protected routes middleware** with role-based access control
- **Password hashing** with bcrypt
- **Input sanitization** and validation
- **Session management** with secure cookies
- **OAuth integration** (Google, GitHub)
- **Two-factor authentication** (2FA)
- **Password reset** functionality
- **Account verification** via email

### Database & ORM

#### Prisma Schema Models
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  username    String?  @unique
  password    String
  firstName   String?
  lastName    String?
  avatar      String?
  role        Role     @default(USER)
  isVerified  Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastLogin   DateTime?
  
  // Relations
  profile     Profile?
  posts       Post[]
  sessions    Session[]
  
  @@map("users")
}

model Profile {
  id          String   @id @default(cuid())
  userId      String   @unique
  bio         String?
  website     String?
  location    String?
  birthDate   DateTime?
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profiles")
}

enum Role {
  ADMIN
  MODERATOR
  USER
}
```

- **Database migrations** setup
- **Seed data** for development
- **Connection pooling** configuration
- **Database indexes** for performance optimization
- **Soft deletes** implementation
- **Audit trails** for data changes

### UI/UX Components

#### Core Components
- **Responsive layout** with header, sidebar, footer
- **Dark/light theme** toggle with system preference detection
- **Loading states** and skeleton components
- **Error boundaries** and fallback components
- **Toast notifications** system
- **Modal dialogs** with backdrop and focus management
- **Data tables** with sorting, filtering, and pagination
- **Form components** with comprehensive validation

#### Shadcn/ui Integration
- Complete component library setup
- Custom theme configuration
- Component variants and compositions
- Accessibility compliance (WCAG 2.1)
- Mobile-first responsive design

### API Architecture

#### RESTful API Structure
```typescript
// API Routes Organization
/api/auth/
  ├── login/
  ├── register/
  ├── refresh/
  ├── logout/
  └── verify/

/api/users/
  ├── [id]/
  ├── profile/
  └── settings/

/api/admin/
  ├── users/
  ├── analytics/
  └── system/
```

- **Request/response validation** with Zod schemas
- **Error handling middleware** with proper HTTP status codes
- **API rate limiting** per endpoint and user
- **CORS configuration** for cross-origin requests
- **Request logging** and monitoring
- **API versioning** strategy
- **OpenAPI/Swagger** documentation

### Development Features

#### Code Quality
- **ESLint configuration** with custom rules
- **Prettier formatting** with consistent style
- **Husky pre-commit hooks** for code quality
- **TypeScript strict mode** enabled
- **Path aliases** configured (@/ for src/)
- **Import sorting** and organization

#### Development Tools
- **Hot reload** for rapid development
- **Environment variable validation** with Zod
- **Database GUI** (Prisma Studio)
- **API testing** setup with Thunder Client/Postman
- **Error tracking** with proper logging

## Docker Configuration

### Multi-stage Dockerfile
```dockerfile
# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Dependencies stage
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose Services
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: development
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@postgres:5432/myapp
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Code Quality & Best Practices

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Component Architecture Patterns
- **Atomic Design Principles** (atoms, molecules, organisms)
- **Custom hooks** for business logic separation
- **Props validation** with TypeScript interfaces
- **Component composition** over inheritance
- **Memoization** with React.memo and useMemo where appropriate
- **Compound components** for complex UI patterns

### Form Management
- **React Hook Form** integration with TypeScript
- **Zod schema validation** for forms and API
- **Custom form components** with reusable patterns
- **File upload** handling with progress and validation
- **Form state persistence** across navigation
- **Multi-step forms** with validation

### State Management Strategy
- **Server state** with TanStack Query (React Query)
- **Client state** with Zustand for global state
- **Form state** with React Hook Form
- **URL state** for shareable application state
- **Local storage** hooks for persistence
- **Optimistic updates** for better UX

## Performance Optimizations

### Next.js Optimizations
- **Image optimization** with Next.js Image component
- **Font optimization** with next/font
- **Bundle analysis** and code splitting strategies
- **Static generation** where appropriate
- **Incremental Static Regeneration** (ISR)
- **Route prefetching** for improved navigation

### Database & Caching
- **Database query optimization** with proper indexes
- **Connection pooling** configuration
- **Redis caching** for session and data caching
- **SWR/React Query** for client-side caching
- **CDN integration** for static assets

### SEO & Performance
- **Metadata API** for dynamic SEO
- **Structured data** implementation
- **Open Graph** and Twitter Cards
- **Sitemap generation** automation
- **Core Web Vitals** optimization

## Testing Setup

### Testing Framework
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress open",
    "test:e2e:headless": "cypress run"
  }
}
```

- **Jest + React Testing Library** for unit and integration tests
- **Cypress** for end-to-end testing
- **MSW (Mock Service Worker)** for API mocking
- **Test containers** for database testing
- **Component testing** with Storybook
- **Visual regression testing** setup

## Security Best Practices

### Application Security
- **CSRF protection** with tokens and SameSite cookies
- **XSS prevention** with Content Security Policy
- **SQL injection protection** via Prisma ORM
- **Input validation** and sanitization
- **Rate limiting** per endpoint and IP
- **Secure headers** configuration
- **Environment variable** security practices

### Authentication Security
- **Password policies** and strength validation
- **Account lockout** after failed attempts
- **Secure session management**
- **JWT token expiration** and rotation
- **Refresh token** security
- **Two-factor authentication** implementation

## Sample CRUD Operations

### User Management API
```typescript
// GET /api/users - List users with pagination
// POST /api/users - Create new user
// GET /api/users/[id] - Get user by ID
// PUT /api/users/[id] - Update user
// DELETE /api/users/[id] - Delete user (soft delete)
// POST /api/users/[id]/avatar - Upload user avatar
// GET /api/users/[id]/activity - Get user activity log
```

### Example Components
- **UserList** with data table, sorting, and filtering
- **UserForm** with validation and file upload
- **UserProfile** with editable sections
- **UserSettings** with preference management
- **AdminPanel** with user management tools

## Deployment Considerations

### Production Setup
- **Multi-stage Docker** builds for optimization
- **Environment-specific** configurations
- **Database migration** strategies
- **Blue-green deployment** support
- **Health checks** and monitoring
- **Logging and error tracking**

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run E2E tests
        run: npm run test:e2e:headless
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t myapp:latest .
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: echo "Deploy to production"
```

## Configuration Files

### Essential Configuration Files Required
1. **package.json** - Dependencies and scripts
2. **next.config.js** - Next.js configuration
3. **tailwind.config.js** - Tailwind CSS setup
4. **prisma/schema.prisma** - Database schema
5. **docker-compose.yml** - Development environment
6. **Dockerfile** - Container configuration
7. **.env.example** - Environment variables template
8. **.eslintrc.json** - Linting rules
9. **.prettierrc** - Code formatting
10. **tsconfig.json** - TypeScript configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# File Storage
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

## Documentation Structure

### Required Documentation
1. **README.md** - Project overview and setup
2. **API Documentation** - Endpoint specifications
3. **Deployment Guide** - Production deployment steps
4. **Development Guide** - Local development setup
5. **Component Library** - UI component documentation
6. **Database Schema** - Entity relationships
7. **Security Guidelines** - Security best practices
8. **Testing Guide** - Testing strategies and examples

## Additional Features

### Advanced Features
- **Real-time updates** with WebSockets or Server-Sent Events
- **File upload** with progress tracking and validation
- **Image processing** and optimization
- **Email notifications** with templates
- **Background job processing** with Bull/BullMQ
- **Audit logging** for data changes
- **Feature flags** system
- **Internationalization** (i18n) support

### Monitoring & Analytics
- **Application monitoring** with Sentry or similar
- **Performance tracking** with Web Vitals
- **User analytics** integration
- **Error tracking** and alerting
- **Database monitoring** and query analysis
- **API monitoring** with response times and error rates

## Conclusion

This boilerplate provides a comprehensive foundation for building modern, scalable web applications with Next.js. It incorporates industry best practices, security considerations, and performance optimizations while maintaining code quality and developer experience.

The architecture is designed to be:
- **Scalable** - Can handle growing user bases and feature sets
- **Maintainable** - Clean code structure and documentation
- **Secure** - Implements security best practices
- **Performance-focused** - Optimized for speed and efficiency
- **Developer-friendly** - Great DX with tooling and automation
- **Production-ready** - Suitable for deployment and monitoring

This specification serves as a complete guide for implementing a robust Next.js application that can be easily extended for various use cases and requirements.