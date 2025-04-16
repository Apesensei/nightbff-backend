# Event Module Tests

This directory contains unit and integration tests for the Event module.

## Directory Structure

- `controllers/` - Tests for event controllers
- `services/` - Tests for event services
- `repositories/` - Tests for event repositories

## Running Tests

To run all tests for the Event module:

```bash
npm test -- --testPathPattern=src/microservices/event
```

To run specific test categories:

```bash
# Run only controller tests
npm test -- --testPathPattern=src/microservices/event/tests/controllers

# Run only service tests
npm test -- --testPathPattern=src/microservices/event/tests/services

# Run only repository tests
npm test -- --testPathPattern=src/microservices/event/tests/repositories
```

## Test Coverage

To generate test coverage for the Event module:

```bash
npm test -- --coverage --testPathPattern=src/microservices/event
```

## Writing New Tests

When adding new tests:

1. Place tests in the appropriate directory based on what they're testing
2. Use descriptive test names that explain the behavior being tested
3. Follow the AAA pattern (Arrange, Act, Assert)
4. Mock external dependencies appropriately

### Example Test Structure

```typescript
describe('FeatureName', () => {
  // Setup and mocks
  
  describe('methodName', () => {
    it('should behave in expected way under specific condition', async () => {
      // Arrange
      const input = {...};
      
      // Act
      const result = await someMethod(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
``` 