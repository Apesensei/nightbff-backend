import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { ConfigService } from "@nestjs/config";
import { ScannedAreaRepository } from "../repositories/scanned-area.repository";
import * as ngeohash from "ngeohash";
import { differenceInHours } from "date-fns";

@Injectable()
export class VenueScanProducerService {
  private readonly logger = new Logger(VenueScanProducerService.name);

  constructor(
    @InjectQueue("venue-scan") private readonly venueScanQueue: Queue,
    private readonly configService: ConfigService,
    private readonly scannedAreaRepository: ScannedAreaRepository,
  ) {}

  /**
   * Public method to enqueue a scan job for a given geohash prefix.
   * Adds a predictable job ID to prevent duplicates if called rapidly.
   */
  public async enqueueScan(geohashPrefix: string): Promise<void> {
    try {
      const jobId = `scan-${geohashPrefix}`;
      await this.venueScanQueue.add(
        "scan-area",
        { geohashPrefix },
        {
          jobId: jobId,
        },
      );
      this.logger.log(
        `Enqueued venue scan job ${jobId} for geohash: ${geohashPrefix}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue venue scan job for ${geohashPrefix}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Checks if a scan is needed for the area and enqueues if stale.
   * (This logic is now primarily in VenueService, but could be kept here as a helper if preferred)
   */
  async enqueueScanIfStale(latitude: number, longitude: number): Promise<void> {
    try {
      const precision = this.configService.get<number>("GEOHASH_PRECISION", 7);
      const thresholdHours = this.configService.get<number>(
        "VENUE_SCAN_STALENESS_THRESHOLD_HOURS",
        72,
      );
      const geohashPrefix = ngeohash.encode(latitude, longitude, precision);
      this.logger.debug(
        `[Producer] Checking staleness for geohash ${geohashPrefix}`,
      );

      const lastScanRecord =
        await this.scannedAreaRepository.findLastScanned(geohashPrefix);
      let shouldScan = true;

      if (lastScanRecord) {
        const hoursSinceLastScan = differenceInHours(
          new Date(),
          lastScanRecord.lastScannedAt,
        );
        if (hoursSinceLastScan < thresholdHours) {
          shouldScan = false;
          this.logger.debug(
            `[Producer] Geohash ${geohashPrefix} scanned recently. Skipping scan.`,
          );
        }
      }

      if (shouldScan) {
        this.logger.log(
          `[Producer] Geohash ${geohashPrefix} is stale. Enqueuing scan.`,
        );
        await this.enqueueScan(geohashPrefix);
      }
    } catch (error) {
      this.logger.error(
        `[Producer] Error during enqueueScanIfStale check: ${error.message}`,
        error.stack,
      );
    }
  }
}
