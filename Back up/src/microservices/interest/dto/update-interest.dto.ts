import { PartialType } from "@nestjs/mapped-types";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateInterestDto } from "./create-interest.dto";
import { IsOptional, IsNumber, Min } from "class-validator";

export class UpdateInterestDto extends PartialType(CreateInterestDto) {
  @ApiPropertyOptional({
    description: "The number of times this interest has been used",
    example: 125,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageCount?: number;
}
