import { IsString, IsNumber, IsOptional, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class PlanSearchDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
