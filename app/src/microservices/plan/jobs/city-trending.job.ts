import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CityRepository } from "../repositories/city.repository";

@Injectable()
export class CityTrendingJob {
  private isRunning = false; // Simple lock to prevent overlap

  constructor(
    private readonly cityRepository: CityRepository,
    private readonly logger: Logger, // Inject Logger
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: "calculateCityTrendingScores",
  }) // Corrected expression
  async handleCron() {
    if (this.isRunning) {
      this.logger.warn(
        "Previous trending score calculation is still running. Skipping this cycle.",
      );
      return;
    }

    this.isRunning = true;
    this.logger.log("Starting calculation of city trending scores...");
    let updatedCount = 0;
    let errorCount = 0;

    try {
      // Use the new findAll method
      const cities = await this.cityRepository.findAll(); // Corrected call
      this.logger.log(`Found ${cities.length} cities to process.`);

      for (const city of cities) {
        try {
          // V1 Score: Directly based on planCount
          const score = city.planCount;
          // V2 Idea: Factor in recent views, saves, plan creation velocity, etc.

          await this.cityRepository.updateTrendingScore(city.id, score);
          updatedCount++;
        } catch (cityError) {
          this.logger.error(
            `Failed to update trending score for city ${city.id} (${city.name}): ${cityError.message}`,
            cityError.stack,
          );
          errorCount++;
        }
      }
      this.logger.log(
        `Finished calculating city trending scores. Updated: ${updatedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Critical error during city trending score calculation: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
