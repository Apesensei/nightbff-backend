import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseProvider {
  private readonly client: SupabaseClient;
  private readonly logger = new Logger(SupabaseProvider.name);

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("SUPABASE_URL");
    const key = this.configService.get<string>("SUPABASE_KEY");

    this.logger.debug(`Attempting to create Supabase client...`);
    this.logger.debug(`SUPABASE_URL from ConfigService: >>${url}<<`);
    this.logger.debug(
      `SUPABASE_KEY from ConfigService: >>${key ? key.substring(0, 10) + "..." : key}<<`,
    );

    this.client = createClient(url || "", key || "");
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
