# Auth Module

## Overview

The Auth module is responsible for managing user authentication, authorization, and the canonical `User` entity within the NightBFF application.

It handles:
- User registration (via Supabase Auth integration)
- User login (email/password)
- JWT token generation and validation
- Route guarding based on authentication status and roles
- Maintaining the core `User` entity data synchronized with Supabase Auth.

This module serves as the single source of truth for user identity and authentication state across the entire backend.

## Key Components

- **`User` Entity (`entities/user.entity.ts`):** The primary TypeORM entity representing core user data. Shared with other modules via `AuthModule` export.
- **`AgeVerification` Entity (`entities/age-verification.entity.ts`):** Stores data related to user age verification.
- **`AuthService` (`auth.service.ts`):** Contains the core logic for registration, login, token handling, and user data synchronization.
- **`AuthRepository` (`repositories/auth.repository.ts`):** Interacts directly with Supabase Auth for sign-up, sign-in operations and fetches/syncs user data with the TypeORM `User` entity.
- **`JwtStrategy` (`strategies/jwt.strategy.ts`):** Passport strategy for validating JWT tokens.
- **`AuthController` (`auth.controller.ts`):** Exposes HTTP endpoints for registration and login.
- **Guards (`guards/`):** Implement route protection (e.g., `JwtAuthGuard`).

## Dependencies

- `@nestjs/passport`, `passport`, `passport-jwt`: For authentication strategies.
- `@nestjs/jwt`: For JWT handling.
- `@nestjs/typeorm`, `typeorm`: For database interaction with the `User` entity.
- `@supabase/supabase-js`: For interacting with Supabase Auth.
- `ConfigModule`: For accessing environment variables (Supabase URL/Key, JWT secret).

## How Other Modules Use It

Modules requiring user data or authentication context should import `AuthModule`. They can then:
- Inject the `User` repository: `@InjectRepository(User)`
- Inject `AuthService` for auth-related operations.
- Use guards like `@UseGuards(JwtAuthGuard)` to protect routes. 