/**
 * Defines the shape for the 'venue.triggerScanIfStale' RPC pattern.
 */
// Remove namespace:
// export namespace TriggerScanIfStaleRpc {
//  /**
//   * Request payload sent by the client (e.g., UserController).
//   */
//  export interface RequestPayload { ... }
//  /**
//   * Response payload returned by the service (VenueService).
//   * Returns void as this is typically a fire-and-forget trigger.
//   */
//  export type ResponsePayload = void;
//  /**
//   * Message pattern string used for this RPC call.
//   */
//  export const messagePattern = "venue.triggerScanIfStale";
// }

/**
 * Request payload for the 'venue.triggerScanIfStale' RPC call.
 * Sent by the client (e.g., UserController).
 */
export interface TriggerScanIfStaleRpcRequestPayload {
  latitude: number;
  longitude: number;
}

/**
 * Response payload for the 'venue.triggerScanIfStale' RPC call.
 * Returned by the service (VenueService).
 * Returns void as this is typically a fire-and-forget trigger.
 */
export type TriggerScanIfStaleRpcResponsePayload = void;

/**
 * Message pattern string used for the 'venue.triggerScanIfStale' RPC call.
 */
export const TRIGGER_SCAN_IF_STALE_RPC_PATTERN = "venue.triggerScanIfStale";
