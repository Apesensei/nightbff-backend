import { Injectable, Logger } from "@nestjs/common";
// import { CityRepository } from "../repositories/city.repository"; // Removed unused import - Inject and use when placeholder code is replaced
import * as fs from "fs";
import * as path from "path";
// import { parse as parseCsv } from 'csv-parse/sync'; // Example: Install 'csv-parse' if needed

interface CitySeedRecord {
  name: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  // Add other fields from source file if needed (e.g., flagEmoji)
}

@Injectable()
export class CitySeederService {
  private readonly logger = new Logger(CitySeederService.name);

  constructor() {} // private readonly cityRepository: CityRepository, // TODO: Inject CityRepository once it's created in Phase 2

  async seedFromFile(
    filePath: string,
  ): Promise<{ processed: number; created: number; failed: number }> {
    this.logger.log(`Starting city seeding from file: ${filePath}`);

    // Placeholder for CityRepository dependency check
    // if (!this.cityRepository) {
    //   this.logger.error('CityRepository is not available. Seeding cannot proceed.');
    //   throw new Error('CityRepository dependency not met.');
    // }

    let cityData: CitySeedRecord[] = [];
    let processed = 0;
    let created = 0; // Track actual creations vs. finds
    let failed = 0;

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Source file not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      const fileExtension = path.extname(filePath).toLowerCase();

      if (fileExtension === ".json") {
        cityData = JSON.parse(fileContent);
      } else if (fileExtension === ".csv") {
        this.logger.warn(
          "CSV parsing not fully implemented. Requires csv-parse library.",
        );
        // Example using csv-parse (install first: npm i csv-parse)
        // cityData = parseCsv(fileContent, {
        //   columns: true, // Assumes header row
        //   skip_empty_lines: true,
        //   trim: true,
        //   cast: (value, context) => {
        //     // Basic casting example
        //     if (context.column === 'latitude' || context.column === 'longitude') {
        //       return parseFloat(value);
        //     }
        //     return value;
        //   }
        // });
        throw new Error(
          "CSV seeding requires manual implementation/library setup.",
        );
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      this.logger.log(`Read ${cityData.length} records from ${filePath}`);

      for (const record of cityData) {
        processed++;
        if (!record.name || !record.countryCode) {
          this.logger.warn(
            `Skipping record due to missing name or countryCode: ${JSON.stringify(record)}`,
          );
          failed++;
          continue;
        }

        // let locationData: { type: "Point"; coordinates: number[] } | undefined =
        //  undefined; // Removed unused variable
        // if (record.latitude !== undefined && record.longitude !== undefined) {
        //   locationData = {
        //     type: "Point",
        //     coordinates: [record.longitude, record.latitude],
        //   };
        // }

        try {
          // --- Replace with actual repository call in Phase 2 ---
          this.logger.debug(
            `Simulating findOrCreate for: ${record.name}, ${record.countryCode}`,
          );
          // const city = await this.cityRepository.findOrCreateByNameAndCountry(
          //   record.name,
          //   record.countryCode,
          //   locationData,
          // );
          // if (city.wasCreated) { // Assuming repo method returns indication of creation
          //    created++;
          // }
          // --- End Placeholder ---

          // Simulate creation for logging purposes until repo exists
          if (processed % 2 === 0) created++;

          if (processed % 100 === 0) {
            this.logger.log(`Processed ${processed} records...`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to process record: ${JSON.stringify(record)} - Error: ${error.message}`,
            error.stack,
          );
          failed++;
        }
      }
    } catch (error) {
      this.logger.error(`Seeding failed: ${error.message}`, error.stack);
      // Depending on the error, you might want to re-throw or just return failure counts
      // For now, we just log and report counts including potentially unprocessed records
      failed += cityData.length - processed + (processed - created - failed); // Estimate remaining as failed
      return { processed, created: 0, failed };
    }

    this.logger.log(
      `Seeding complete. Processed: ${processed}, Created: ${created} (Simulated), Failed: ${failed}`,
    );
    return { processed, created, failed };
  }
}
