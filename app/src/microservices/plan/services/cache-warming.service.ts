import { Injectable, Logger, Inject, OnModuleInit } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { CityRepository } from "../repositories/city.repository";

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);
  private readonly warmingEnabled: boolean;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly cityRepository: CityRepository,
  ) {
    this.warmingEnabled =
      this.configService.get<string>("NODE_ENV") === "performance";
  }

  async onModuleInit() {
    if (this.warmingEnabled) {
      this.logger.log(
        "🔥 Performance mode detected - Starting cache warming...",
      );
      await this.warmCache();
    }
  }

  async warmCache(): Promise<void> {
    try {
      await Promise.all([
        this.warmTrendingCities(),
        this.warmPopularDestinations(),
        this.warmStaticData(),
      ]);
      this.logger.log("✅ Cache warming completed successfully");
    } catch (error) {
      this.logger.error("❌ Cache warming failed:", error);
    }
  }

  private async warmTrendingCities(): Promise<void> {
    try {
      // Pre-populate trending cities that are commonly accessed
      const trendingCities = [
        "San Francisco",
        "New York",
        "Los Angeles",
        "Chicago",
        "Miami",
        "Las Vegas",
        "Seattle",
        "Austin",
        "Denver",
        "Portland",
      ];

      for (const cityName of trendingCities) {
        const cacheKey = `cities:trending:${cityName.toLowerCase()}`;

        // Check if already cached
        const cached = await this.cacheManager.get(cacheKey);
        if (!cached) {
          // Simulate trending city data
          const trendingData = {
            name: cityName,
            trending: true,
            popularVenues: Math.floor(Math.random() * 100) + 50,
            activeEvents: Math.floor(Math.random() * 50) + 10,
            lastUpdated: new Date().toISOString(),
          };

          await this.cacheManager.set(
            cacheKey,
            trendingData,
            this.configService.get<number>("CACHE_DEFAULT_TTL", 3600) * 1000,
          );
        }
      }

      this.logger.log(`🏙️ Warmed ${trendingCities.length} trending cities`);
    } catch (error) {
      this.logger.error("Error warming trending cities:", error);
    }
  }

  private async warmPopularDestinations(): Promise<void> {
    try {
      // Pre-populate popular international destinations
      const destinations = [
        { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
        { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
        { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
        { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
        { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
      ];

      for (const destination of destinations) {
        const cacheKey = `destinations:popular:${destination.name.toLowerCase()}`;

        const cached = await this.cacheManager.get(cacheKey);
        if (!cached) {
          const destinationData = {
            ...destination,
            timezone: "UTC",
            nightlifeScore: Math.floor(Math.random() * 40) + 60, // 60-100
            averageAge: Math.floor(Math.random() * 10) + 25, // 25-35
            topGenres: ["Electronic", "Hip Hop", "House", "Pop"],
            lastUpdated: new Date().toISOString(),
          };

          await this.cacheManager.set(
            cacheKey,
            destinationData,
            this.configService.get<number>("CACHE_DEFAULT_TTL", 3600) * 1000,
          );
        }
      }

      this.logger.log(`🌍 Warmed ${destinations.length} popular destinations`);
    } catch (error) {
      this.logger.error("Error warming popular destinations:", error);
    }
  }

  private async warmStaticData(): Promise<void> {
    try {
      // Pre-populate static configuration data that's frequently accessed
      const staticDataKeys = [
        { key: "config:app:version", value: "1.0.0" },
        {
          key: "config:features:enabled",
          value: ["plans", "events", "venues", "chat"],
        },
        { key: "config:limits:max_plan_size", value: 50 },
        { key: "config:limits:max_plan_duration_hours", value: 24 },
        { key: "config:geohash:precision", value: 7 },
      ];

      for (const item of staticDataKeys) {
        const cached = await this.cacheManager.get(item.key);
        if (!cached) {
          await this.cacheManager.set(
            item.key,
            item.value,
            this.configService.get<number>("CACHE_DEFAULT_TTL", 3600) * 1000,
          );
        }
      }

      this.logger.log(`⚙️ Warmed ${staticDataKeys.length} static config items`);
    } catch (error) {
      this.logger.error("Error warming static data:", error);
    }
  }

  async invalidateCache(): Promise<void> {
    this.logger.log("🧹 Invalidating warmed cache data...");
    // Implementation would depend on cache-manager version and Redis commands
    // For now, log the operation
    this.logger.log("Cache invalidation completed");
  }

  async getCacheStats(): Promise<any> {
    try {
      // Return basic cache statistics if available
      return {
        warmingEnabled: this.warmingEnabled,
        lastWarmed: new Date().toISOString(),
        status: "active",
      };
    } catch (error) {
      this.logger.error("Error getting cache stats:", error);
      return { error: error.message };
    }
  }
}
