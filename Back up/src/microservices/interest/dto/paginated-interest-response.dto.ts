import { ApiProperty } from "@nestjs/swagger";
import { InterestResponseDto } from "./interest-response.dto";

export class PaginatedInterestResponseDto {
  @ApiProperty({ type: [InterestResponseDto] })
  interests: InterestResponseDto[];

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;
}
