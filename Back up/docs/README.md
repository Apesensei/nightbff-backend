# Application Documentation (`app/docs/`)

This directory serves as a central repository for documentation that spans multiple modules or covers cross-cutting concerns within the NightBFF backend application.

While individual microservice modules (`app/src/microservices/*`) should have their own `README.md` files detailing their specific purpose, components, and APIs (following the [template](./templates/module-readme-template.md)), this `docs/` directory is intended for:

- **Project-Wide Information:**
  - [Technical Debt Register](./project/tech-debt.md)
  - Architecture Decision Records (ADRs) (Planned)
  - Overall System Architecture Diagrams (Planned)
- **In-Depth Guides & Deep Dives:**
  - Detailed Authentication Flow (Planned)
  - Database Schema Evolution Strategy (Planned)
  - Error Handling Philosophy (Planned)
  - Deployment Strategy (Planned)
- **Module-Specific Extended Documentation (Use Sparingly):**
  - If a module requires documentation too extensive for its README (e.g., complex algorithms, detailed third-party integrations), it can be placed here and linked from the module's README.
  - Example: [User Module Extension Points](./modules/user/extension-points.md) (Phase 2 Planning)

## Structure

- `/project`: Documentation related to the project as a whole.
- `/modules`: Extended documentation specific to certain microservice modules.
- `/guides`: Step-by-step guides or tutorials for common development tasks.
- `/adr`: Architecture Decision Records.
- `/templates`: Reusable documentation templates.

*Note: This structure is evolving. Please update this README if adding new top-level categories.*

## Project Documentation

This directory contains documentation for the NightBFF application.

### Project-wide Documents

- [Technical Debt Register](./project/tech-debt.md) - A register of known technical debt items and plans for resolution

### Module Documentation

#### Event Module

- [Extension Points](./modules/event/extension-points.md) - Documentation of extension points for Phase 2 implementations

## Repository Organization

The NightBFF codebase is organized as follows:

### Source Code

- `app/src` - Main application source code
  - `microservices` - Microservice modules
    - `event` - Event management functionality
    - `venue` - Venue management functionality
    - `user` - User management functionality
    - `auth` - Authentication functionality
    - More modules...

### Testing

Test files are organized in a hierarchical structure that mirrors the source code:

- `app/src/microservices/event/tests` - Event module tests
  - `controllers` - Controller tests
  - `services` - Service tests
  - `repositories` - Repository tests

### Documentation

Documentation is organized by scope:

- `app/docs/project` - Project-wide documentation
- `app/docs/modules/[module-name]` - Module-specific documentation 