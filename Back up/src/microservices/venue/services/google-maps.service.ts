import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { VenueCacheService } from "./venue-cache.service";
import { RateLimiterService } from "./rate-limiter.service";

interface GoogleMapsGeocodingResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
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
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
  };
  price_level?: number;
  website?: string;
  formatted_phone_number?: string;
}

interface GoogleMapsApiResponse<T> {
  status: string;
  results?: T[];
  result?: T;
}

@Injectable()
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://maps.googleapis.com/maps/api";
  private readonly logger = new Logger(GoogleMapsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: VenueCacheService,
    private readonly rateLimiter: RateLimiterService,
  ) {
    this.apiKey = this.configService.get<string>("GOOGLE_MAPS_API_KEY") || "";
    if (!this.apiKey) {
      this.logger.warn(
        "Google Maps API key is not set. Map-based venue discovery will not work correctly.",
      );
    }
  }

  /**
   * Geocode an address to get latitude and longitude
   */
  async geocodeAddress(address: string): Promise<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
    placeId: string;
  } | null> {
    try {
      // Check cache first
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsGeocodingResult>
      >("geocode", { address });

      if (
        cached &&
        cached.status === "OK" &&
        cached.results &&
        cached.results.length > 0
      ) {
        const result = cached.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
        };
      }

      // Check rate limit
      const canProceed = await this.rateLimiter.checkAndConsume("geocode");
      if (!canProceed) {
        this.logger.warn("Rate limit exceeded for geocoding");
        return null;
      }

      const response = await axios.get<
        GoogleMapsApiResponse<GoogleMapsGeocodingResult>
      >(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (
        response.data.status === "OK" &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        // Cache the response
        await this.cacheService.set(
          "geocode",
          { address },
          response.data,
          86400,
        ); // Cache for 24 hours

        const result = response.data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to geocode address: ${error.message}`,
        error.stack,
      );
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
    try {
      const params: any = {
        location: `${latitude},${longitude}`,
        radius: radius * 1609.34, // Convert miles to meters
        key: this.apiKey,
      };

      if (type) {
        params.type = type;
      }

      if (keyword) {
        params.keyword = keyword;
      }

      // Check cache first
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      >("nearby", params);

      if (cached && cached.status === "OK" && cached.results) {
        return cached.results;
      }

      // Check rate limit
      const canProceed =
        await this.rateLimiter.checkAndConsume("places.nearby");
      if (!canProceed) {
        this.logger.warn("Rate limit exceeded for nearby search");
        return [];
      }

      const response = await axios.get<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      >(`${this.baseUrl}/place/nearbysearch/json`, { params });

      if (response.data.status === "OK" && response.data.results) {
        // Cache the response for 1 hour
        await this.cacheService.set("nearby", params, response.data);
        return response.data.results;
      }

      return [];
    } catch (error) {
      this.logger.error(
        `Failed to search nearby places: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get place details
   */
  async getPlaceDetails(
    placeId: string,
  ): Promise<GoogleMapsPlaceResult | null> {
    try {
      // Check cache first
      const cached = await this.cacheService.get<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      >("details", { placeId });

      if (cached && cached.status === "OK" && cached.result) {
        return cached.result;
      }

      // Check rate limit
      const canProceed =
        await this.rateLimiter.checkAndConsume("places.details");
      if (!canProceed) {
        this.logger.warn("Rate limit exceeded for place details");
        return null;
      }

      const response = await axios.get<
        GoogleMapsApiResponse<GoogleMapsPlaceResult>
      >(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          fields:
            "name,place_id,formatted_address,geometry,rating,user_ratings_total,types,photos,opening_hours,price_level,website,formatted_phone_number",
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK" && response.data.result) {
        // Cache the response for 24 hours
        await this.cacheService.set(
          "details",
          { placeId },
          response.data,
          86400,
        );
        return response.data.result;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get place details: ${error.message}`,
        error.stack,
      );
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
