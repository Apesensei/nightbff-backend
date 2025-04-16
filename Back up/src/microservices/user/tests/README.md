# User Module Tests

This directory contains unit and integration tests for the User module, with a specific focus on the Social Connection System functionality.

## Directory Structure

- `controllers/` - Tests for user controllers
- `services/` - Tests for user services
- `repositories/` - Tests for user repositories

## Running Tests

To run all tests for the User module:

```bash
npm test -- --testPathPattern=src/microservices/user
```

To run specific test categories:

```bash
# Run only controller tests
npm test -- --testPathPattern=src/microservices/user/tests/controllers

# Run only service tests
npm test -- --testPathPattern=src/microservices/user/tests/services

# Run only repository tests
npm test -- --testPathPattern=src/microservices/user/tests/repositories
```

## Social Connection System Tests

The Social Connection System tests cover:

1. **Relationship Management**
   - Creating, updating, and deleting user relationships
   - Handling relationship status changes
   - Blocking and reporting functionality

2. **User Discovery**
   - Finding nearby users with geospatial queries
   - Recommended user algorithms
   - Privacy-aware filtering

3. **Profile Views**
   - Tracking and retrieving profile views
   - Anonymous vs. identified viewing
   - View count and notification logic

## Test Coverage

To generate test coverage for the User module:

```bash
npm test -- --coverage --testPathPattern=src/microservices/user
```

## Writing New Tests

When adding new tests:

1. Place tests in the appropriate directory based on what they're testing
2. Use descriptive test names that explain the behavior being tested
3. Follow the AAA pattern (Arrange, Act, Assert)
4. Mock external dependencies appropriately

### Example Test Structure

```typescript
describe('UserDiscoveryService', () => {
  // Setup and mocks
  
  describe('findNearbyUsers', () => {
    it('should return users within specified radius', async () => {
      // Arrange
      const mockUsers = [/* mock user data */];
      userRepositoryMock.findNearbyUsers.mockResolvedValue([mockUsers, mockUsers.length]);
      
      // Act
      const result = await service.findNearbyUsers('user-123', 40.7128, -74.0060, { radiusInKm: 5 });
      
      // Assert
      expect(result.users).toHaveLength(mockUsers.length);
      expect(result.total).toBe(mockUsers.length);
      expect(userRepositoryMock.findNearbyUsers).toHaveBeenCalledWith(
        expect.objectContaining({ radiusInKm: 5 }),
        'user-123'
      );
    });
  });
});
``` 