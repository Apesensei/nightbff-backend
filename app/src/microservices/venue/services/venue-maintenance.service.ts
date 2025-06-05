import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { subHours } from "date-fns";
import * as ngeohash from "ngeohash";

import { VenueRepository } from "../repositories/venue.repository";
import { VenueScanProducerService } from "./venue-scan-producer.service";

@Injectable()
export class VenueMaintenanceService {
  private readonly logger = new Logger(VenueMaintenanceService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly venueRepository: VenueRepository,
    private readonly venueScanProducerService: VenueScanProducerService,
  ) {}

  @Cron(process.env.VENUE_STALENESS_REFRESH_CRON || "0 0 * * 0", {
    name: "venueStalenessCheck",
    timeZone: "Etc/UTC",
  })
  async handleVenueStalenessCheck() {
    const jobName = "handleVenueStalenessCheck";
    this.logger.log(`[${jobName}] Starting periodic venue staleness check.`);

    try {
      await this.runStalenessCheckLogic();
    } catch (error) {
      this.logger.error(
        `[${jobName}] Critical error during staleness check: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Public method that runs the core staleness check logic.
   * This is separated from the cron handler to facilitate testing.
   * @returns A summary object with counts of processed venues, unique geohashes, errors, etc.
   */
  public async runStalenessCheckLogic() {
    const jobName = "runStalenessCheckLogic";
    this.logger.log(`[${jobName}] Running venue staleness check logic.`);

    const stalenessHours = this.configService.get<number>(
      "VENUE_SCAN_STALENESS_THRESHOLD_HOURS",
      168,
    );
    const precision = this.configService.get<number>("GEOHASH_PRECISION", 7);
    const cutoffDate = subHours(new Date(), stalenessHours);

    this.logger.log(
      `[${jobName}] Finding venues not refreshed since ${cutoffDate.toISOString()} (Threshold: ${stalenessHours} hours).`,
    );

    const staleVenues =
      await this.venueRepository.findStaleLocations(cutoffDate);

    if (!staleVenues || staleVenues.length === 0) {
      this.logger.log(`[${jobName}] No stale venues found requiring refresh.`);
      return {
        staleVenuesCount: 0,
        uniqueGeohashCount: 0,
        enqueuedCount: 0,
        decodeErrors: 0,
      };
    }

    this.logger.log(
      `[${jobName}] Found ${staleVenues.length} potentially stale venues.`,
    );

    const uniqueGeohashPrefixes = new Set<string>();
    let decodeErrors = 0;
    for (const venue of staleVenues) {
      if (!venue.location) {
        this.logger.warn(
          `[${jobName}] Stale venue ${venue.id} missing location data. Skipping.`,
        );
        continue;
      }
      try {
        const match = venue.location.match(/POINT\(([-.\d]+) ([-.\d]+)\)/);
        if (match) {
          const longitude = parseFloat(match[1]);
          const latitude = parseFloat(match[2]);
          const geohashPrefix = ngeohash.encode(latitude, longitude, precision);
          uniqueGeohashPrefixes.add(geohashPrefix);
        } else {
          this.logger.warn(
            `[${jobName}] Could not parse WKT location for stale venue ${venue.id}: ${venue.location}`,
          );
          decodeErrors++;
        }
      } catch (error) {
        this.logger.error(
          `[${jobName}] Error encoding geohash for stale venue ${venue.id}: ${error.message}`,
          error.stack,
        );
        decodeErrors++;
      }
    }

    const geohashList = Array.from(uniqueGeohashPrefixes);
    this.logger.log(
      `[${jobName}] Found ${geohashList.length} unique geohash areas to scan (Decode errors: ${decodeErrors}).`,
    );

    let enqueuedCount = 0;
    for (const geohashPrefix of geohashList) {
      try {
        const { latitude, longitude } = ngeohash.decode(geohashPrefix);
        await this.venueScanProducerService.enqueueScanIfStale(
          latitude,
          longitude,
        );
        enqueuedCount++;
      } catch (error) {
        this.logger.error(
          `[${jobName}] Error decoding/enqueuing geohash ${geohashPrefix}: ${error.message}`,
          error.stack,
        );
        decodeErrors++;
      }
    }

    this.logger.log(
      `[${jobName}] Finished enqueuing ${enqueuedCount} scan jobs for stale areas.`,
    );

    return {
      staleVenuesCount: staleVenues.length,
      uniqueGeohashCount: geohashList.length,
      enqueuedCount,
      decodeErrors,
    };
  }
}
