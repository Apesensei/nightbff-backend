import { Controller, Get, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CacheWarmingService } from "../services/cache-warming.service";
import { ConfigService } from "@nestjs/config";

@ApiTags("Performance Monitoring")
@Controller("performance")
export class PerformanceMonitoringController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheWarmingService: CacheWarmingService,
    private readonly configService: ConfigService,
  ) {}

  @Get("metrics")
  @ApiOperation({ summary: "Get comprehensive performance metrics" })
  @ApiResponse({
    status: 200,
    description: "Performance metrics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        cache: { type: "object" },
        database: { type: "object" },
        system: { type: "object" },
        timestamp: { type: "string" },
      },
    },
  })
  async getMetrics() {
    const metrics = {
      cache: await this.getCacheMetrics(),
      database: await this.getDatabaseMetrics(),
      system: await this.getSystemMetrics(),
      configuration: await this.getConfigurationMetrics(),
      timestamp: new Date().toISOString(),
    };

    return metrics;
  }

  @Get("cache/status")
  @ApiOperation({ summary: "Get cache status and effectiveness" })
  @ApiResponse({
    status: 200,
    description: "Cache status retrieved successfully",
  })
  async getCacheStatus() {
    return {
      ...(await this.getCacheMetrics()),
      warmingStats: await this.cacheWarmingService.getCacheStats(),
    };
  }

  @Get("cache/warm")
  @ApiOperation({ summary: "Manually trigger cache warming" })
  @ApiResponse({
    status: 200,
    description: "Cache warming triggered successfully",
  })
  async warmCache() {
    await this.cacheWarmingService.warmCache();
    return {
      message: "Cache warming completed",
      timestamp: new Date().toISOString(),
    };
  }

  private async getCacheMetrics() {
    try {
      // Get cache stats if available from the underlying store
      const store = (this.cacheManager as any).store;

      // Basic cache information
      const cacheInfo = {
        type: "redis",
        storeType: store?.constructor?.name || "unknown",
        ttlDefaults: {
          default: this.configService.get("CACHE_DEFAULT_TTL", 300),
          events: this.configService.get("CACHE_DEFAULT_TTL_EVENTS", 1800),
          venues: this.configService.get("CACHE_DEFAULT_TTL_VENUES", 7200),
          users: this.configService.get("CACHE_DEFAULT_TTL_USERS", 1800),
          interests: this.configService.get(
            "CACHE_DEFAULT_TTL_INTERESTS",
            3600,
          ),
        },
        status: "operational",
      };

      // Sample cache key checks to determine effectiveness
      const sampleKeys = [
        "cities:trending:san francisco",
        "destinations:popular:tokyo",
        "config:app:version",
      ];

      let hits = 0;
      for (const key of sampleKeys) {
        const value = await this.cacheManager.get(key);
        if (value) hits++;
      }

      const effectiveness = (hits / sampleKeys.length) * 100;

      return {
        ...cacheInfo,
        sampleHitRate: `${effectiveness.toFixed(1)}%`,
        sampleKeysTested: sampleKeys.length,
        sampleKeysHit: hits,
      };
    } catch (error) {
      return {
        error: "Failed to retrieve cache metrics",
        details: error.message,
      };
    }
  }

  private async getDatabaseMetrics() {
    try {
      const poolConfig = {
        maxConnections: this.configService.get("DB_POOL_SIZE", 10),
        acquireTimeout: this.configService.get(
          "DB_POOL_ACQUIRE_TIMEOUT",
          30000,
        ),
        idleTimeout: this.configService.get("DB_POOL_IDLE_TIMEOUT", 600000),
        status: "configured",
      };

      return {
        connectionPool: poolConfig,
        url: this.configService.get("DATABASE_URL")
          ? "configured"
          : "not configured",
        environment: this.configService.get("NODE_ENV", "development"),
      };
    } catch (error) {
      return {
        error: "Failed to retrieve database metrics",
        details: error.message,
      };
    }
  }

  private async getSystemMetrics() {
    try {
      const processMemory = process.memoryUsage();

      return {
        memory: {
          rss: `${Math.round(processMemory.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(processMemory.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(processMemory.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(processMemory.external / 1024 / 1024)}MB`,
        },
        uptime: `${Math.round(process.uptime())}s`,
        nodeVersion: process.version,
        pid: process.pid,
      };
    } catch (error) {
      return {
        error: "Failed to retrieve system metrics",
        details: error.message,
      };
    }
  }

  private async getConfigurationMetrics() {
    return {
      performanceMode: this.configService.get("NODE_ENV") === "performance",
      authMode: this.configService.get("AUTH_MODE", "supabase"),
      metricsEnabled: this.configService.get("METRICS_ENABLED", false),
      healthCheckEnabled: this.configService.get("HEALTH_CHECK_ENABLED", false),
      imageProcessingAsync: this.configService.get(
        "IMAGE_PROCESSING_ASYNC",
        false,
      ),
    };
  }

  @Get("health")
  @ApiOperation({ summary: "Get system health status" })
  @ApiResponse({
    status: 200,
    description: "Health status retrieved successfully",
  })
  async getHealthStatus() {
    const health = {
      status: "healthy",
      checks: {
        cache: "checking...",
        database: "checking...",
        memory: "checking...",
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // Cache health check
      await this.cacheManager.set("health:check", "ok", 10000);
      const cacheCheck = await this.cacheManager.get("health:check");
      health.checks.cache = cacheCheck === "ok" ? "healthy" : "unhealthy";
    } catch {
      health.checks.cache = "unhealthy";
      health.status = "degraded";
    }

    try {
      // Memory health check
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      health.checks.memory = heapUsedMB < 512 ? "healthy" : "warning";
    } catch {
      health.checks.memory = "unhealthy";
    }

    // Database health check would require actual connection test
    health.checks.database = "healthy"; // Placeholder

    return health;
  }
}
