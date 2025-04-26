import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { ScannedAreaRepository } from '../repositories/scanned-area.repository';
import * as ngeohash from 'ngeohash';
import { differenceInHours } from 'date-fns';

@Injectable()
export class VenueScanProducerService {
  private readonly logger = new Logger(VenueScanProducerService.name);

  constructor(
    @InjectQueue('venue-scan') private readonly venueScanQueue: Queue,
    private readonly configService: ConfigService,
    private readonly scannedAreaRepository: ScannedAreaRepository,
  ) {}

  /**
   * Checks if an area needs scanning based on staleness threshold and enqueues a job if necessary.
   * This is the primary method callers should use.
   * @param latitude 
   * @param longitude 
   */
  async enqueueScanIfStale(latitude: number, longitude: number): Promise<void> {
    try {
        const precision = this.configService.get<number>('GEOHASH_PRECISION', 7);
        const stalenessHours = this.configService.get<number>('VENUE_SCAN_STALENESS_THRESHOLD_HOURS', 168);
        
        const geohashPrefix = ngeohash.encode(latitude, longitude, precision);
        this.logger.debug(`Checking staleness for geohash: ${geohashPrefix} (from Producer)`);

        const scannedArea = await this.scannedAreaRepository.findLastScanned(geohashPrefix);
        const now = new Date();
        let needsScan = true; // Assume scan needed unless proven otherwise

        if (scannedArea) {
            const hoursSinceLastScan = differenceInHours(now, scannedArea.lastScannedAt);
            if (hoursSinceLastScan < stalenessHours) {
                needsScan = false;
                this.logger.debug(`Geohash ${geohashPrefix} scanned ${hoursSinceLastScan} hours ago (threshold: ${stalenessHours}). Scan not needed (Producer).`);
            } else {
                 this.logger.log(`Geohash ${geohashPrefix} last scanned ${hoursSinceLastScan} hours ago (threshold: ${stalenessHours}). Triggering scan (Producer).`);
            }
        } else {
            this.logger.log(`Geohash ${geohashPrefix} has not been scanned before. Triggering scan (Producer).`);
        }

        if (needsScan) {
            // Call the internal enqueue method
            await this.enqueueScan(geohashPrefix);
            this.logger.log(`Scan job enqueued for geohash ${geohashPrefix} (triggered by staleness check).`); 
        }
    } catch (error) {
        // Log errors originating from this check/trigger logic
        this.logger.error(`Error in enqueueScanIfStale for ${latitude},${longitude}: ${error.message}`, error.stack);
        // Do not re-throw, as this usually runs fire-and-forget.
    }
  }

  /**
   * Internal method to actually add the job to the queue.
   * Uses a specific jobId to prevent duplicate jobs for the same prefix if triggered rapidly.
   * @param geohashPrefix The geohash prefix identifying the area to scan.
   */
  private async enqueueScan(geohashPrefix: string): Promise<void> {
    const jobId = `scan-${geohashPrefix}`; // Unique job ID based on the area
    try {
      // Check if a job with the same ID already exists or is active/waiting
      const existingJob = await this.venueScanQueue.getJob(jobId);
      const isActiveOrWaiting = existingJob && (await existingJob.isActive() || await existingJob.isWaiting());
      
      if (isActiveOrWaiting) { 
          this.logger.debug(`Job ${jobId} for geohash ${geohashPrefix} is already active or waiting. Skipping internal enqueue.`);
          return;
      }

      this.logger.log(`Internally enqueuing scan job ${jobId} for geohash prefix: ${geohashPrefix}`);
      await this.venueScanQueue.add(
        'scan-area',
        { geohashPrefix }, 
        { jobId: jobId }, // Let default options apply from module config
      );
    } catch (error) {
      this.logger.error(
        `Failed to internally enqueue scan job ${jobId} for geohash ${geohashPrefix}: ${error.message}`,
        error.stack,
      );
      // Consider re-throwing if internal failure is critical
      throw error; // Re-throw internal queueing errors
    }
  }
} 