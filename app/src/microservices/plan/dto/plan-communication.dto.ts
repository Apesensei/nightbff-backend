/**
 * Base interface for all event payloads emitted via Redis.
 * Ensures mandatory eventId for idempotency tracking.
 */
export interface BaseEventPayload {
  eventId: string; // Unique UUID for this specific event instance
}

/**
 * Payload for the 'plan.created' event.
 */
export interface PlanCreatedPayload extends BaseEventPayload {
  planId: string;
  creatorId: string;
  cityId: string;
  venueId?: string; // Include if associated at creation
  startDate: Date;
  endDate?: Date;
}

/**
 * Payload for the 'plan.deleted' event.
 */
export interface PlanDeletedPayload extends BaseEventPayload {
  planId: string;
  creatorId: string;
  cityId: string;
  venueId?: string; // Include if it had one
}

/**
 * Payload for the 'plan.saved' event (when a user saves a plan).
 */
export interface PlanSavedPayload extends BaseEventPayload {
  planId: string;
  userId: string; // User who saved the plan
  cityId: string; // City context might be useful for listeners
}

/**
 * Payload for the 'plan.unsaved' event (when a user unsaves a plan).
 */
export interface PlanUnsavedPayload extends BaseEventPayload {
  planId: string;
  userId: string; // User who unsaved the plan
  cityId: string;
}

/**
 * Payload for the 'plan.viewed' event.
 */
export interface PlanViewedPayload extends BaseEventPayload {
  planId: string;
  userId?: string; // Optional: User who viewed it (if known/relevant)
  cityId: string;
}
