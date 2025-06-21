import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import axiosRetry from "axios-retry";
import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { VenueCacheService } from "./venue-cache.service";
import { RateLimiterService } from "./rate-limiter.service";

// Restore original interface definitions
interface GoogleMapsGeocodingResult {
  geometry: { location: { lat: number; lng: number } };
  formatted_address: string;
  place_id: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
interface GoogleMapsPlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: Array<{ photo_reference: string; height: number; width: number }>;
  opening_hours?: { open_now: boolean };
  price_level?: number;
  website?: string;
  formatted_phone_number?: string;
}
interface GoogleMapsApiResponse<T> {
  status: string;
  results?: T[];
  result?: T;
}
interface GoogleMapsReverseGeocodingResult {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
  place_id: string;
}
interface GeocodeAddressResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

@Injectable()
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: VenueCacheService,
    private readonly rateLimiter: RateLimiterService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>("GOOGLE_MAPS_API_KEY") || "";
    this.baseUrl =
      this.configService.get<string>("GOOGLE_MAPS_BASE_URL") ||
      "https://maps.googleapis.com/maps/api";

    if (!this.apiKey) {
      this.logger.warn(
        "Google Maps API key is not set. Map-based venue discovery will not work correctly.",
      );
    }

    this.logger.debug(
      `GoogleMapsService initialized with baseUrl: ${this.baseUrl}`,
    );

    this.axiosInstance = this.httpService.axiosRef;

    // Configure axios-retry directly, not via .default
    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount: number, error: AxiosError) => {
        const delay = Math.pow(2, retryCount) * 500;
        const jitter = delay * 0.2 * (Math.random() - 0.5);
        const totalDelay = Math.round(delay + jitter);
        this.logger.warn(
          `Retry attempt ${retryCount + 1} for ${error.config?.method?.toUpperCase()} ${error.config?.url} due to ${error.code || error.response?.status}. Delaying ${totalDelay}ms...`,
        );
        return totalDelay;
      },
      retryCondition: (error: AxiosError) => {
        const responseStatus = error.response?.status;
        const shouldRetry =
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          responseStatus === 429 ||
          (responseStatus !== undefined && responseStatus >= 500);
        if (shouldRetry) {
          this.logger.log(
            `Retry condition met for status ${responseStatus || "network error"}`,
          );
        } else {
          this.logger.log(
            `Retry condition NOT met for status ${responseStatus}`,
          );
        }
        return shouldRetry;
      },
      shouldResetTimeout: true,
    });
  }

  /**
   * Geocode an address to get latitude, longitude, and components
   */
  async geocodeAddress(address: string): Promise<GeocodeAddressResult | null> {
    const cacheKeyParams = { address };
    this.logger.debug(`[DEBUG] geocodeAddress START - Address: ${address}`);
    try {
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsGeocodingResult>
      >("geocode", cacheKeyParams);
      if (
        cached?.status === "OK" &&
        cached.results &&
        cached.results.length > 0
      ) {
        this.logger.debug(`Cache hit for geocode: ${address}`);
        const result = cached.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          address_components: result.address_components,
        };
      }
    } catch (cacheError) {
      this.logger.error(
        `Cache read error for geocode '${address}': ${cacheError.message}`,
        cacheError.stack,
      );
    }

    const canProceed = await this.rateLimiter.checkAndConsume("geocode");
    if (!canProceed) {
      this.logger.warn(`Client rate limit exceeded for geocoding: ${address}`);
      this.logger.debug(`[DEBUG] geocodeAddress END - Rate Limited`);
      return null;
    }

    this.logger.debug(
      `Cache miss or error. Attempting Google API geocode: ${address}`,
    );
    try {
      this.logger.debug(
        `[DEBUG] Attempting this.axiosInstance.get for ${address}`,
      );
      const response: AxiosResponse<
        GoogleMapsApiResponse<GoogleMapsGeocodingResult>
      > = await this.axiosInstance.get(`${this.baseUrl}/geocode/json`, {
        params: { address, key: this.apiKey },
      });
      this.logger.debug(
        `[DEBUG] API Call returned. Response status: ${response?.status}, Data status: ${response?.data?.status}`,
      );
      if (response && response.data) {
        if (
          response.data.status === "OK" &&
          response.data.results &&
          response.data.results.length > 0
        ) {
          this.logger.debug(
            `[DEBUG] Success path entered. Status: ${response.data.status}`,
          );
          try {
            await this.cacheService.set(
              "geocode",
              cacheKeyParams,
              response.data,
              86400,
            );
          } catch (cacheError) {
            this.logger.error(
              `Cache write error after geocode success for '${address}': ${cacheError.message}`,
              cacheError.stack,
            );
          }
          const result = response.data.results[0];
          const formattedResult = {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            address_components: result.address_components,
          };
          this.logger.debug(
            `[DEBUG] geocodeAddress END - Returning Success: ${JSON.stringify(formattedResult)}`,
          );
          return formattedResult;
        } else {
          this.logger.warn(
            `[DEBUG] Non-OK status path. Status: ${response.data.status}`,
          );
          return null;
        }
      } else {
        this.logger.error(
          `[DEBUG] Invalid response object received after API call.`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(
        `[DEBUG] Caught error: ${error?.message}`,
        error?.stack,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `[DEBUG] Axios Error Details - Status: ${error.response?.status}, Code: ${error.code}`,
        );
      }
      this.logger.error(
        `Failed to geocode address '${address}' after exhausting retries or due to non-retryable error: ${error.message}`,
        error.stack,
      );
      this.logger.debug(
        `[DEBUG] geocodeAddress END - Returning Null from Catch`,
      );
      return null;
    }
  }

  /**
   * Reverse Geocode coordinates to get address components
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GoogleMapsReverseGeocodingResult | null> {
    const cacheKeyParams = { lat: latitude, lon: longitude };
    try {
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsReverseGeocodingResult>
      >("reverseGeocode", cacheKeyParams);
      if (
        cached?.status === "OK" &&
        cached.results &&
        cached.results.length > 0
      ) {
        this.logger.debug(
          `Cache hit for reverse geocode: ${latitude},${longitude}`,
        );
        return cached.results[0];
      }
    } catch (cacheError) {
      this.logger.error(
        `Cache read error for reverse geocode ${latitude},${longitude}: ${cacheError.message}`,
        cacheError.stack,
      );
    }

    const canProceed = await this.rateLimiter.checkAndConsume("geocode");
    if (!canProceed) {
      this.logger.warn(
        `Client rate limit exceeded for reverse geocoding: ${latitude},${longitude}`,
      );
      return null;
    }

    this.logger.debug(
      `Cache miss or error. Attempting Google API reverse geocode: ${latitude},${longitude}`,
    );
    try {
      const response: AxiosResponse<
        GoogleMapsApiResponse<GoogleMapsReverseGeocodingResult>
      > = await this.axiosInstance.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
          result_type: "locality|administrative_area_level_1",
        },
      });

      if (
        response.data.status === "OK" &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        this.logger.debug(
          `Successfully reverse geocoded: ${latitude},${longitude}. Status: ${response.data.status}`,
        );
        try {
          await this.cacheService.set(
            "reverseGeocode",
            cacheKeyParams,
            response.data,
            86400,
          );
        } catch (cacheError) {
          this.logger.error(
            `Cache write error after reverse geocode success for ${latitude},${longitude}: ${cacheError.message}`,
            cacheError.stack,
          );
        }
        return response.data.results[0];
      } else {
        this.logger.warn(
          `Reverse geocoding for ${latitude},${longitude} returned status: ${response.data.status}`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to reverse geocode ${latitude},${longitude} after exhausting retries or due to non-retryable error: ${error.message}`,
        error.stack,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Final Error Details - Status: ${error.response?.status}, Code: ${error.code}, Config: ${JSON.stringify(error.config)}, Response Data: ${JSON.stringify(error.response?.data)}`,
        );
      }
      return null;
    }
  }

  /**
   * Search for places near a location
   */
  async searchNearby(
    latitude: number,
    longitude: number,
    radius: number,
    type?: string,
    keyword?: string,
  ): Promise<GoogleMapsPlaceResult[]> {
    const radiusInMeters = radius * 1609.34;
    const params: any = {
      location: `${latitude},${longitude}`,
      radius: radiusInMeters,
      key: this.apiKey,
    };

    if (type) params.type = type;
    if (keyword) params.keyword = keyword;

    const cacheKeyParams = params;

    try {
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      >("nearby", cacheKeyParams);
      if (cached?.status === "OK" && cached.results) {
        this.logger.debug(
          `Cache hit for nearby search: lat=${latitude}, lon=${longitude}, r=${radius}`,
        );
        return cached.results;
      }
      if (cached?.status === "ZERO_RESULTS") {
        this.logger.debug(
          `Cache hit (ZERO_RESULTS) for nearby search: lat=${latitude}, lon=${longitude}, r=${radius}`,
        );
        return [];
      }
    } catch (cacheError) {
      this.logger.error(
        `Cache read error for nearby search ${latitude},${longitude}: ${cacheError.message}`,
        cacheError.stack,
      );
    }

    const canProceed = await this.rateLimiter.checkAndConsume("places.nearby");
    if (!canProceed) {
      this.logger.warn(
        `Client rate limit exceeded for nearby search: ${latitude},${longitude}`,
      );
      return [];
    }

    this.logger.debug(
      `Cache miss or error. Attempting Google API nearby search: ${latitude},${longitude}`,
    );
    try {
      const response: AxiosResponse<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      > = await this.axiosInstance.get(
        `${this.baseUrl}/place/nearbysearch/json`,
        { params },
      );

      if (
        response.data.status === "OK" ||
        response.data.status === "ZERO_RESULTS"
      ) {
        this.logger.debug(
          `Successfully completed nearby search for ${latitude},${longitude}. Status: ${response.data.status}`,
        );
        const results = response.data.results || [];
        try {
          await this.cacheService.set("nearby", cacheKeyParams, response.data);
        } catch (cacheError) {
          this.logger.error(
            `Cache write error after nearby search success for ${latitude},${longitude}: ${cacheError.message}`,
            cacheError.stack,
          );
        }
        return results;
      } else {
        this.logger.warn(
          `Nearby search for ${latitude},${longitude} returned status: ${response.data.status}`,
        );
        return [];
      }
    } catch (error) {
      this.logger.error(
        `Failed to search nearby for ${latitude},${longitude} after exhausting retries or due to non-retryable error: ${error.message}`,
        error.stack,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Final Error Details - Status: ${error.response?.status}, Code: ${error.code}, Config: ${JSON.stringify(error.config)}, Response Data: ${JSON.stringify(error.response?.data)}`,
        );
      }
      return [];
    }
  }

  /**
   * Get place details
   */
  async getPlaceDetails(
    placeId: string,
  ): Promise<GoogleMapsPlaceResult | null> {
    const cacheKeyParams = { placeId };
    try {
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      >("details", cacheKeyParams);
      if (cached?.status === "OK" && cached.result) {
        this.logger.debug(`Cache hit for place details: ${placeId}`);
        return cached.result;
      }
      if (cached?.status && cached.status !== "OK") {
        this.logger.debug(
          `Cache hit (${cached.status}) for place details ${placeId}`,
        );
        return null;
      }
    } catch (cacheError) {
      this.logger.error(
        `Cache read error for place details ${placeId}: ${cacheError.message}`,
        cacheError.stack,
      );
    }

    const canProceed = await this.rateLimiter.checkAndConsume("places.details");
    if (!canProceed) {
      this.logger.warn(
        `Client rate limit exceeded for place details: ${placeId}`,
      );
      return null;
    }

    this.logger.debug(
      `Cache miss or error. Attempting Google API place details: ${placeId}`,
    );
    try {
      const response: AxiosResponse<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      > = await this.axiosInstance.get(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          fields:
            "name,place_id,formatted_address,geometry,rating,user_ratings_total,types,photos,opening_hours,price_level,website,formatted_phone_number,address_components",
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK" && response.data.result) {
        this.logger.debug(
          `Successfully got place details for ${placeId}. Status: ${response.data.status}`,
        );
        try {
          await this.cacheService.set(
            "details",
            cacheKeyParams,
            response.data,
            86400,
          );
        } catch (cacheError) {
          this.logger.error(
            `Cache write error after place details success for ${placeId}: ${cacheError.message}`,
            cacheError.stack,
          );
        }
        return response.data.result;
      } else {
        this.logger.warn(
          `Place details for ${placeId} returned status: ${response.data.status}`,
        );
        if (response.data.status) {
          try {
            await this.cacheService.set(
              "details",
              cacheKeyParams,
              response.data,
              3600,
            );
          } catch (cacheError) {
            this.logger.error(
              `Cache write error for non-OK details status ${placeId}: ${cacheError.message}`,
              cacheError.stack,
            );
          }
        }
        return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to get place details for ${placeId} after exhausting retries or due to non-retryable error: ${error.message}`,
        error.stack,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Final Error Details - Status: ${error.response?.status}, Code: ${error.code}, Config: ${JSON.stringify(error.config)}, Response Data: ${JSON.stringify(error.response?.data)}`,
        );
      }
      return null;
    }
  }

  /**
   * Get photo URL from photo reference
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${this.baseUrl}/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }
}
