import {
  Controller,
  Get,
  Inject,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { PlanService } from "./plan.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { User } from "../auth/entities/user.entity";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { Request } from "express";

// Define interface for request with user
interface RequestWithUser extends Request {
  user?: User;
}

@ApiTags("Plans")
@Controller("plans")
export class PlanController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly planService: PlanService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new plan" })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The plan has been successfully created.",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized.",
  })
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Req() req: RequestWithUser,
    @Body() createPlanDto: CreatePlanDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.planService.createPlan(req.user.id, createPlanDto as any);
  }

  @Get("/cache-health-check")
  async cacheHealthCheck(): Promise<object> {
    const loggerPrefix = "[PlanController CacheHealthCheck]";
    try {
      const key = "plan_controller_test_cache_key_" + Date.now();
      const value = "health_check_value_" + Date.now();
      const ttlSeconds = 10;

      console.log(
        loggerPrefix +
          " Setting key: '" +
          key +
          "' with value: '" +
          value +
          "' and TTL: " +
          ttlSeconds +
          "s",
      );
      await this.cacheManager.set(key, value, ttlSeconds * 1000);

      console.log(loggerPrefix + " Getting key: '" + key + "'");
      const retrievedValue = await this.cacheManager.get(key);

      if (retrievedValue === value) {
        console.log(
          loggerPrefix + " Success! Retrieved value matches set value.",
        );
        return {
          status: "OK",
          operation: "set_and_get",
          key_used: key,
          value_set: value,
          value_retrieved: retrievedValue,
          ttl_seconds: ttlSeconds,
        };
      } else {
        console.error(
          loggerPrefix +
            " ERROR! Retrieved value does NOT match. Expected: '" +
            value +
            "', Got: '" +
            retrievedValue +
            "'",
        );
        return {
          status: "ERROR",
          operation: "set_and_get",
          key_used: key,
          expected: value,
          retrieved: retrievedValue,
        };
      }
    } catch (error) {
      console.error(loggerPrefix + " EXCEPTION!", error);
      return {
        status: "EXCEPTION",
        message: error.message,
        stack: error.stack,
      };
    }
  }
}
