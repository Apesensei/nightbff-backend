import { Module, Global } from "@nestjs/common";
import { FeatureFlagService } from "./flag.service";

@Global()
@Module({
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}
