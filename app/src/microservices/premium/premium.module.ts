import { Module } from "@nestjs/common";
// import { PremiumController } from './premium.controller'; // Temporarily commented out - File missing
// import { PremiumService } from './premium.service'; // Temporarily commented out - File missing
// import { PremiumRepository } from './repositories/premium.repository'; // Temporarily commented out - File missing

@Module({
  controllers: [
    /* PremiumController */
  ], // Temporarily commented out
  providers: [
    /* PremiumService, PremiumRepository */
  ], // Temporarily commented out
  exports: [
    /* PremiumService */
  ], // Temporarily commented out
})
export class PremiumModule {}
