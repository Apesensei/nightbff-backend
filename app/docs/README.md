# NightBFF Documentation

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