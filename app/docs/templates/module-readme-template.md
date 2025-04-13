# [ModuleName] Module

## 1. Purpose

<!-- Briefly describe the module's main responsibility and role within the application architecture. -->
<!-- Example: Manages user profiles, relationships, preferences, and discovery features. -->

## 2. Key Components

<!-- List the main entities, services, repositories, controllers, DTOs, etc. -->
<!-- Use bullet points and link to the source files if possible. -->

- **Entities:**
  - `[EntityName].entity.ts`: Description...
- **Services:**
  - `[ServiceName].service.ts`: Description...
- **Repositories:**
  - `[RepositoryName].repository.ts`: Description...
- **Controllers:**
  - `[ControllerName].controller.ts`: Description...
- **DTOs:**
  - `dto/[DtoName].dto.ts`: Description...

## 3. API Endpoints (If Applicable)

<!-- List the main REST API endpoints exposed by this module's controller(s). -->
<!-- Use format: METHOD /path/to/endpoint - Brief description -->

- `GET /module-path/...`: Retrieves...
- `POST /module-path/...`: Creates...

## 4. Dependencies

<!-- List internal module dependencies and significant external libraries/services. -->

- **Internal Modules:**
  - `AuthModule`: For User entity access, authentication context.
  - `[OtherModule]`: Reason...
- **External Libraries:**
  - `TypeORM`: For database interaction.
  - `[LibraryName]`: Reason...
- **External Services:**
  - `[ServiceName]`: Reason (e.g., Supabase Auth, Google Maps API).

## 5. Testing

<!-- Explain how to run tests specific to this module. -->

Tests for this module are located in `src/microservices/[module-name]/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/[module-name]
```

Run specific test types:
```bash
npm test -- --testPathPattern=src/microservices/[module-name]/tests/[controllers|services|repositories]
```

## 6. Environment Variables

<!-- List any environment variables specifically required or used heavily by this module. -->

- `EXAMPLE_MODULE_SPECIFIC_API_KEY`: Used for...
- `DATABASE_URL`: (Inherited) Used for TypeORM connection.

## 7. Notes / Design Decisions

<!-- Optional: Include any important notes, design rationale, or future considerations specific to this module. --> 