import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { JoinEventDto } from "./dto/join-event.dto";
import { EventResponseDto } from "./dto/event-response.dto";
import { AttendeeResponseDto } from "./dto/attendee-response.dto";
import { JwtAuthGuard } from "@/microservices/auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "@/common/guards/optional-jwt-auth.guard";
import { FindEventsOptions } from "./repositories/event.repository";
import { TrendingPlansRequestDto } from "./dto/trending-plans-request.dto";
import { PlanSearchDto } from "./dto/plan-search.dto";
import { PaginatedEventResponseDto } from "./dto/paginated-event-response.dto";
import { CurrentUser } from "@/microservices/auth/decorators/current-user.decorator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";

// User request with authentication
interface RequestWithUser extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags("events")
@Controller("events")
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new event" })
  @ApiResponse({
    status: 201,
    description: "Event created successfully",
    type: EventResponseDto,
  })
  async create(
    @Request() req: RequestWithUser,
    @Body() createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.create(req.user.id, createEventDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Find all events with optional filters, including 'forYou' interest ID",
  })
  @ApiResponse({ status: 200, description: "List of events" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Authentication required",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "venueId", required: false, type: String })
  @ApiQuery({
    name: "interestId",
    required: false,
    type: String,
    description:
      "Optional. Filter events by a specific interest ID, or use the special value 'forYou' to filter by the authenticated user\'s primary interest (V1). Using 'forYou' requires authentication.",
  })
  async findAll(
    @Request() req: RequestWithUser,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("venueId") venueId?: string,
    @Query("interestId") interestId?: string,
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const userId = req.user.id;

    const options: FindEventsOptions = {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      venueId,
      title: search,
      interestId,
    };

    if (startDate) {
      options.startTimeFrom = new Date(startDate);
    }

    if (endDate) {
      options.startTimeTo = new Date(endDate);
    }

    return this.eventService.findAll(options, userId);
  }

  @Get("my-events")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get events created by the authenticated user" })
  @ApiResponse({
    status: 200,
    description: "Events retrieved successfully",
    type: [EventResponseDto],
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async findMyEvents(
    @Request() req: RequestWithUser,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.findAll(
      {
        creatorId: req.user.id,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      },
      req.user.id,
    );
  }

  @Get("attending")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get events the authenticated user is attending" })
  @ApiResponse({
    status: 200,
    description: "Events retrieved successfully",
    type: [EventResponseDto],
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async getEventsAttendedByUser(
    @Request() req: RequestWithUser,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.getEventsAttendedByUser(req.user.id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("trending")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Get trending plans" })
  @ApiResponse({ status: HttpStatus.OK, description: "Returns trending plans" })
  async getTrendingPlans(
    @Query() queryParams: TrendingPlansRequestDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedEventResponseDto> {
    const userId = req.user?.id;
    return this.eventService.getTrendingPlans(queryParams, userId);
  }

  @Get("search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Search for plans by text and filters" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns plans matching search criteria",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Authentication required",
  })
  async searchPlans(
    @Request() req: RequestWithUser,
    @Query() searchDto: PlanSearchDto,
  ): Promise<PaginatedEventResponseDto> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const userId = req.user.id;

    const { events, total } = await this.eventService.findAll(
      {
        title: searchDto.query,
        limit: searchDto.limit,
        offset: searchDto.offset,
      },
      userId,
    );

    const page =
      Math.floor((searchDto.offset || 0) / (searchDto.limit || 10)) + 1;
    const limit = searchDto.limit || 10;
    const hasMore = total > (searchDto.offset || 0) + limit;

    return {
      items: events,
      total,
      page,
      limit,
      hasMore,
    };
  }

  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Get an event by ID" })
  @ApiResponse({
    status: 200,
    description: "Event retrieved successfully",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async findOne(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
  ): Promise<EventResponseDto> {
    const userId = req.user?.id;
    return this.eventService.findOne(id, userId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an event" })
  @ApiResponse({
    status: 200,
    description: "Event updated successfully",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - not event creator" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async update(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.update(id, req.user.id, updateEventDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete an event" })
  @ApiResponse({ status: 204, description: "Event deleted successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - not event creator" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async remove(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.remove(id, req.user.id);
  }

  @Get(":id/attendees")
  @ApiOperation({ summary: "Get attendees for an event" })
  @ApiResponse({
    status: 200,
    description: "Attendees retrieved successfully",
    type: [AttendeeResponseDto],
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async getAttendees(
    @Param("id") id: string,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<{ attendees: AttendeeResponseDto[]; total: number }> {
    return this.eventService.getAttendees(id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Join an event" })
  @ApiResponse({
    status: 201,
    description: "Successfully joined event",
    type: AttendeeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - event reached capacity",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - event requires approval",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async joinEvent(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
    @Body() joinEventDto: JoinEventDto,
  ): Promise<AttendeeResponseDto> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.joinEvent(id, req.user.id, joinEventDto);
  }

  @Delete(":id/leave")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Leave an event" })
  @ApiResponse({ status: 204, description: "Successfully left event" })
  @ApiResponse({
    status: 400,
    description: "Bad request - not attending or creator cannot leave",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async leaveEvent(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return this.eventService.leaveEvent(id, req.user.id);
  }
}
