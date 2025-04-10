# Rule Set 2: Development Workflow Guidelines

## Implementation Process

### Project Initialization
- Read through project documentation thoroughly
- Focus only on code areas relevant to the assigned task
- Prefer iterating on existing code rather than creating new solutions
- Consider what other code areas might be affected by your changes

### Planning Phase
- Identify core requirements
- Consider 3 implementation approaches
- Choose simplest approach that meets needs
- Verify with questions:
  - Can this be split into smaller functions?
  - Are there unnecessary abstractions?
  - Will this be clear to a junior dev?

### Implementation Phase
- For simple changes (single-file updates), specify exact files to modify
- For complex changes, outline a comprehensive implementation plan first
- Kill related running servers before starting a new one
- Always start a new server after changes to allow testing

### Validation Phase
- Frequently run tests to validate new functionality
- Consider different environments (dev, test, prod)
- Fix underlying issues rather than just gracefully handling errors

## Debugging Approach

### Problem Analysis
- Ensure sufficient information to understand the problem deeply
- Add more logging and tracing before making changes
- When provided logs with obvious problems, implement solutions directly

### Methodical Debugging
When uncertain about the source:
1. Reflect on 4-6 different possible causes
2. Distill to 1-2 most likely sources
3. Implement solution for most likely cause or add diagnostics

### Debugging Process
1. Observe failure
2. Determine if it's a core service issue
3. Collect appropriate metrics (full system snapshot or targeted metrics)
4. Compare with baseline or add contextual logging
5. Identify deviations
6. Form hypothesis
7. Validate in shadow mode
8. Implement fix if confirmed or expand observation

## Critical Thinking Framework

### Risk Assessment
Before making significant changes, assess impact through these lenses:
- **Dependency risk**: How many components might be affected?
- **Knowledge gaps**: What aspects of the system are unclear?
- **Rollback cost**: How difficult would it be to revert changes?
- **Validation plan**: What test scenarios should be created?

### Decision Making
Only proceed when risks are acceptable:
- Dependency risk is minimal
- Knowledge gaps are understood
- Rollback is straightforward
- Testing is comprehensive
