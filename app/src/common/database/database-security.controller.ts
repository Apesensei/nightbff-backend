import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DatabaseSecurityService } from "./database-security.service";
import { JwtAuthGuard } from "../../microservices/auth/guards/jwt-auth.guard";

/**
 * Database Security Controller
 *
 * Provides endpoints for monitoring database security status
 * and connection information.
 */
@ApiTags("Database Security")
@Controller("api/database/security")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class DatabaseSecurityController {
  constructor(
    private readonly databaseSecurityService: DatabaseSecurityService,
  ) {}

  /**
   * Get database connection security information
   */
  @Get("info")
  @ApiOperation({
    summary: "Get database security information",
    description:
      "Returns comprehensive database security status including SSL configuration and connection details",
  })
  @ApiResponse({
    status: 200,
    description: "Database security information retrieved successfully",
    schema: {
      type: "object",
      properties: {
        ssl: {
          type: "object",
          properties: {
            ssl_enabled: { type: "boolean" },
            ssl_version: { type: "string" },
            ssl_cipher: { type: "string" },
            database_name: { type: "string" },
            current_user: { type: "string" },
            server_address: { type: "string" },
            server_port: { type: "number" },
          },
        },
        timestamp: { type: "string", format: "date-time" },
        environment: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async getSecurityInfo() {
    return await this.databaseSecurityService.getConnectionSecurityInfo();
  }

  /**
   * Test database connection security
   */
  @Get("test")
  @ApiOperation({
    summary: "Test database connection security",
    description:
      "Tests database connection and verifies SSL encryption is working properly",
  })
  @ApiResponse({
    status: 200,
    description: "Database security test completed",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        timestamp: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async testConnectionSecurity() {
    const success = await this.databaseSecurityService.testSecureConnection();

    return {
      success,
      message: success
        ? "Database connection security test passed"
        : "Database connection security test failed",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get SSL configuration status
   */
  @Get("ssl-config")
  @ApiOperation({
    summary: "Get SSL configuration status",
    description: "Returns current SSL configuration for database connections",
  })
  @ApiResponse({
    status: 200,
    description: "SSL configuration retrieved successfully",
    schema: {
      type: "object",
      properties: {
        sslEnabled: { type: "boolean" },
        sslMode: { type: "string" },
        rejectUnauthorized: { type: "boolean" },
        hasCACert: { type: "boolean" },
        hasClientCert: { type: "boolean" },
        hasClientKey: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSSLConfig() {
    const sslConfig = this.databaseSecurityService.getSSLConfig();

    return {
      sslEnabled: sslConfig !== false,
      sslMode: sslConfig?.sslmode || "default",
      rejectUnauthorized: sslConfig?.rejectUnauthorized || false,
      hasCACert: !!sslConfig?.ca,
      hasClientCert: !!sslConfig?.cert,
      hasClientKey: !!sslConfig?.key,
    };
  }
}
