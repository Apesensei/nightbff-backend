import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ScannedArea } from "../entities/scanned-area.entity";

@Injectable()
export class ScannedAreaRepository {
  constructor(
    @InjectRepository(ScannedArea)
    private readonly repository: Repository<ScannedArea>,
  ) {}

  async findLastScanned(geohashPrefix: string): Promise<ScannedArea | null> {
    return this.repository.findOne({
      where: { geohashPrefix },
    });
  }

  /**
   * Creates or updates the last scanned timestamp for a given geohash prefix.
   * Uses TypeORM's save which handles upsert based on primary key.
   */
  async upsertLastScanned(
    geohashPrefix: string,
    scannedAt: Date,
  ): Promise<ScannedArea> {
    const scannedArea = this.repository.create({
      geohashPrefix: geohashPrefix,
      lastScannedAt: scannedAt,
    });
    // TypeORM's save performs an upsert if the entity with the primary key exists
    return this.repository.save(scannedArea);
  }

  // Optional: Add a method to explicitly find or throw
  async findLastScannedOrThrow(geohashPrefix: string): Promise<ScannedArea> {
    const scannedArea = await this.findLastScanned(geohashPrefix);
    if (!scannedArea) {
      throw new NotFoundException(
        `Scanned area with prefix ${geohashPrefix} not found.`,
      );
    }
    return scannedArea;
  }
}
