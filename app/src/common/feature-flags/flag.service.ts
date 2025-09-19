import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * A stub service for feature flagging.
 * In a real scenario, this would integrate with a service like LaunchDarkly.
 * For CI/CD and local development without a key, it provides a safe-to-fail default.
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private isSdkAvailable: boolean;

  constructor(private configService: ConfigService) {
    const sdkKey = this.configService.get<string>("LD_SDK_KEY");
    if (sdkKey && sdkKey.startsWith("sdk-")) {
      this.isSdkAvailable = true;
      this.logger.log("LaunchDarkly SDK key found, feature flags are LIVE.");
    } else {
      this.isSdkAvailable = false;
      this.logger.warn(
        "LaunchDarkly SDK key not found or is a stub. Feature flags will return default values.",
      );
    }
  }

  /**
   * Gets the value of a feature flag.
   * @param key The key of the feature flag.
   * @param defaultValue The default value to return if the flag is not found or the SDK is unavailable.
   * @returns The boolean value of the flag, or the default value.
   */
  getFlag(key: string, defaultValue = false): boolean {
    if (!this.isSdkAvailable) {
      return defaultValue;
    }

    // In a real implementation, you would use the LaunchDarkly client here.
    // For example: return this.ldClient.variation(key, defaultValue);
    this.logger.log(
      `(Stub) Checking flag '${key}', returning default: ${defaultValue}`,
    );
    return defaultValue;
  }
}
