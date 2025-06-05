import { City } from "../entities/city.entity";
import { BaseEventPayload } from "./plan-communication.dto"; // Assuming Base is in plan DTOs

/**
 * Payload for the 'city.created' event.
 * Emitted by CityRepository after a new city is successfully saved.
 */
export interface CityCreatedPayload extends BaseEventPayload {
  cityId: string;
  name: string;
  countryCode: string;
  location?: any; // GeoJSON Point or WKT string, depending on implementation
}

/**
 * Defines the shape for the 'city.findOrCreate' RPC pattern.
 */
/**
 * Request payload for the 'city.findOrCreate' RPC call.
 * Sent by the client (e.g., VenueScanConsumer).
 */
export interface FindOrCreateCityRpcRequestPayload {
  name: string;
  countryCode: string;
  location?: {
    // GeoJSON Point structure
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
}

/**
 * Response payload for the 'city.findOrCreate' RPC call.
 * Returned by the service (CityService).
 * Returns the found or newly created City entity, or null on failure.
 */
export type FindOrCreateCityRpcResponsePayload = City | null;

/**
 * Message pattern string used for the 'city.findOrCreate' RPC call.
 */
export const FIND_OR_CREATE_CITY_RPC_PATTERN = "city.findOrCreate";
