# Technical Debt Register

## Current Items

| ID | Description | Impact | Difficulty | Created | Target Phase |
|----|-------------|--------|------------|---------|--------------|
| TD-1 | VenueService has Phase 1 permissions (any authenticated user) | Security | Medium | 2023-07-15 | Phase 3 |
| TD-2 | Event entity uses string references for relations instead of TypeORM references | Maintenance | Low | 2023-07-20 | Phase 2 |
| TD-3 | Missing comprehensive error handling in event attendance operations | UX | Medium | 2023-07-20 | Phase 2 |

### TD-1 Details

VenueService currently allows any authenticated user to perform venue operations (create, update, delete, add events). This is appropriate for Phase 1 but will need to be restricted to VENUE_OWNER and ADMIN roles in Phase 3.

Required changes for Phase 3:
1. Implement feature flag system for role-based permission control
2. Restore role checks with feature flag controls
3. Add venue ownership verification logic
4. Ensure appropriate UI controls reflect permission changes

The code in VenueService has been temporarily modified with TODO comments marking where the role checks should be reinstated in Phase 3. The methods affected are:
- createVenue
- updateVenue
- addVenueEvent

### TD-2 Details

Event entity and EventAttendee entity use string references for relations to avoid circular dependencies:

```typescript
@OneToMany('EventAttendee', 'event', { cascade: true })
attendees: any[]; // Will be typed as EventAttendee[] at runtime
```

This should be refactored to use proper TypeORM references with forward references in Phase 2:

```typescript
@OneToMany(() => forwardRef(() => EventAttendee), attendee => attendee.event, { cascade: true })
attendees: EventAttendee[];
```

### TD-3 Details

Event attendance operations (join, leave) have basic error handling but lack comprehensive validation:
- No validation for conflicting events
- Limited notifications for errors 
- Missing graceful degradation for permission issues

Phase 2 should implement:
- Validation service for attendance conflicts
- Enhanced error feedback 
- Proper permission fallbacks
