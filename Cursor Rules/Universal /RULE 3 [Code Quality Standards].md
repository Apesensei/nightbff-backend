# Rule Set 3: Code Quality Standards

## TypeScript/JavaScript Best Practices

### Core Principles
1. **Minimal**: Write absolute minimum code needed to solve the problem
2. **Self-documenting**:
   - Use precise naming (verbs for functions, nouns for variables)
   - Create single-responsibility components
   - Use obvious data structures
   - Add short comments when necessary
3. **Type-Exact**: Use strict TypeScript types with zero `any`
4. **Secure**: Implement built-in security for auth/data handling
5. **Performant**: Follow Next.js optimization guides

### Type System
- Use explicit return types on functions
- Define interfaces for data structures
- Avoid type assertions unless absolutely necessary
- Use union types instead of `any`
- Create reusable type definitions for common patterns

## Code Organization

### Size and Complexity
- Keep files under 300 lines; refactor when approaching this limit
- Split long functions into smaller, focused functions
- Limit function complexity and nesting depth
- Maintain clean, organized codebase with consistent patterns

### Code Reuse
- Avoid code duplication by checking for similar existing functionality
- Extract reusable logic into helper functions or utility modules
- Don't write one-time scripts in permanent files
- Don't mock data except for tests (never for dev or prod environments)

### Architecture Patterns
- Follow established project patterns for new components
- Avoid drastically changing existing patterns without explicit instruction
- Exhaust all options using existing implementations before introducing new patterns
- If introducing a new pattern to replace an old one, remove the old implementation

## Testing Standards

### Test Coverage
- Write thorough tests for all major functionality
- Include unit tests for individual functions
- Add integration tests for component interactions
- Test edge cases and error conditions

### Test Organization
- Organize tests to mirror the structure of the source code
- Group related tests together
- Use descriptive test names that express expected behavior
- Separate test setup from assertions

### Test Quality
- Make tests deterministic (no random values)
- Avoid testing implementation details
- Focus on testing behavior and outcomes
- Keep tests independent of each other
