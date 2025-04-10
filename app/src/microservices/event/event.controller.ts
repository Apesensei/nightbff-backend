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
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "@/common/guards/optional-jwt-auth.guard";
import { FindEventsOptions } from "./repositories/event.repository";
import { TrendingPlansRequestDto } from "./dto/trending-plans-request.dto";
import { PlanSearchDto } from "./dto/plan-search.dto";
import { PaginatedEventResponseDto } from "./dto/paginated-event-response.dto";

// Temporary interface to avoid @nestjs/swagger dependency
interface ApiTags {
  (name: string): ClassDecorator;
}
interface ApiOperation {
  (options: { summary: string }): MethodDecorator;
}
interface ApiResponse {
  (options: {
    status: number;
    description: string;
    type?: any;
  }): MethodDecorator;
}
interface ApiQuery {
  (options: { name: string; required: boolean; type: any }): MethodDecorator;
}
interface ApiBearerAuth {
  (): MethodDecorator;
}

// Mock decorators if @nestjs/swagger is not available
const ApiTags: ApiTags = () => (target: any) => target;
const ApiOperation: ApiOperation =
  () => (target: any, key: string, descriptor: PropertyDescriptor) =>
    descriptor;
const ApiResponse: ApiResponse =
  () => (target: any, key: string, descriptor: PropertyDescriptor) =>
    descriptor;
const ApiQuery: ApiQuery =
  () => (target: any, key: string, descriptor: PropertyDescriptor) =>
    descriptor;
const ApiBearerAuth: ApiBearerAuth =
  () => (target: any, key: string, descriptor: PropertyDescriptor) =>
    descriptor;

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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Get all events with filtering options" })
  @ApiResponse({
    status: 200,
    description: "Events retrieved successfully",
    type: [EventResponseDto],
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "venueId", required: false, type: String })
  @ApiQuery({ name: "categoryId", required: false, type: String })
  async findAll(
    @Request() req: RequestWithUser,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("venueId") venueId?: string,
    @Query("categoryId") categoryId?: string,
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    const userId = req.user?.id;

    const options: FindEventsOptions = {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      venueId,
      title: search, // Map search to title in repository
    };

    // Process dates if provided
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
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        creatorId: req.user.id,
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Search for plans by text and filters" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns plans matching search criteria",
  })
  async searchPlans(
    @Query() searchDto: PlanSearchDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedEventResponseDto> {
    const userId = req.user?.id;
    const { events, total } = await this.eventService.findAll(
      {
        title: searchDto.query,
        limit: searchDto.limit,
        offset: searchDto.offset,
      },
      userId,
    );

    return {
      items: events,
      total,
      page: Math.floor((searchDto.offset || 0) / (searchDto.limit || 10)) + 1,
      limit: searchDto.limit || 10,
      hasMore: total > (searchDto.offset || 0) + (searchDto.limit || 10),
    };
  }
}
