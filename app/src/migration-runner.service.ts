import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class MigrationRunnerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(private readonly dataSource: DataSource) {}

  // This method will run automatically when the application bootstraps
  // !! IMPORTANT !! This is temporary for running the migration.
  // !! REMOVE THIS METHOD CALL or the entire service after migration is done !!
  async onApplicationBootstrap() {
    // Only run in development to avoid accidental production runs via this method
    if (process.env.NODE_ENV === "development") {
      this.logger.log(
        "TEMP: Application bootstrapped, attempting to run pending migrations...",
      );
      try {
        const executedMigrations = await this.dataSource.runMigrations();
        if (executedMigrations.length > 0) {
          this.logger.log("TEMP: Successfully executed migrations:");
          executedMigrations.forEach((migration) =>
            this.logger.log(`- ${migration.name}`),
          );
        } else {
          this.logger.log("TEMP: No pending migrations found to execute.");
        }
      } catch (error) {
        this.logger.error(
          "TEMP: Error running migrations on bootstrap:",
          error,
        );
      }
    } else {
      this.logger.warn(
        "TEMP: MigrationRunnerService skipped in non-development environment.",
      );
    }
  }

  // Optional: Keep a separate method if you want to trigger manually via other means later
  // async runDbMigrations() {
  //   this.logger.log('Explicitly running pending migrations...');
  //   try {
  //     const executedMigrations = await this.dataSource.runMigrations();
  //       if (executedMigrations.length > 0) {
  //         this.logger.log('Successfully executed migrations:');
  //         executedMigrations.forEach(migration => this.logger.log(`- ${migration.name}`));
  //       } else {
  //         this.logger.log('No pending migrations found to execute.');
  //       }
  //   } catch (error) {
  //     this.logger.error('Error running migrations explicitly:', error);
  //   }
  // }
}
