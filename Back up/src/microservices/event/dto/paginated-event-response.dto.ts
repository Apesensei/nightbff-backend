import { EventResponseDto } from "./event-response.dto";

export class PaginatedEventResponseDto {
  items: EventResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
