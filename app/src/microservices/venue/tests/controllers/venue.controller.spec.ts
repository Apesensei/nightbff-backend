import { Test, TestingModule } from "@nestjs/testing";
import { VenueController } from "../../controllers/venue.controller";
import { VenueService } from "../../services/venue.service";
import { VenueSearchDto } from "../../dto/venue-search.dto";
import { PaginatedVenueResponseDto } from "../../dto/paginated-venue-response.dto";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { UnauthorizedException } from "@nestjs/common";

describe("VenueController", () => {
  let controller: VenueController;
  let service: VenueService;
  let mockAuthGuard: { canActivate: jest.Mock };

  // Mock Paginated Response Structure (adjust properties as needed)
  const mockPaginatedResponse: PaginatedVenueResponseDto = {
    items: [
      {
        id: "venue-1",
        name: "Test Venue",
        address: "123 Main St",
        isFollowing: false /* other VenueResponseDto props */,
      } as any,
    ],
    total: 1,
    page: 1,
    limit: 10,
    hasMore: false,
  };

  // Mock Service Implementation
  const mockVenueService = {
    // Mock all methods used by the controller
    getTrendingVenues: jest.fn(),
    followVenue: jest.fn(),
    unfollowVenue: jest.fn(),
    getRecentlyViewedVenues: jest.fn(),
    getDiscoverVenuesData: jest.fn(),
    searchVenues: jest.fn().mockResolvedValue(mockPaginatedResponse), // Default mock for searchVenues
    findById: jest.fn(),
    transformToVenueResponseDto: jest.fn(),
    // Add mocks for other methods like findById if needed by other controller endpoints
  };

  beforeEach(async () => {
    mockAuthGuard = { canActivate: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VenueController],
      providers: [
        {
          provide: VenueService,
          useValue: mockVenueService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<VenueController>(VenueController);
    service = module.get<VenueService>(VenueService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("searchVenues", () => {
    it("should call VenueService.searchVenues with correct parameters", async () => {
      // Arrange
      const userId = "test-user-id";
      const searchDto: VenueSearchDto = {
        query: "Test Query",
        limit: 15,
        offset: 0,
        // Add other DTO properties as needed for the test
      };

      // Act
      await controller.searchVenues(searchDto, userId);

      // Assert
      expect(service.searchVenues).toHaveBeenCalledWith(searchDto, userId);
    });

    // --- NEW TEST CASE: 'forYou' with interests ---
    it("should call VenueService.searchVenues with interestId='forYou'", async () => {
      // Arrange
      const userId = "user-with-interests";
      const searchDto: VenueSearchDto = {
        interestId: "forYou",
        limit: 10,
      };
      const mockResponse: PaginatedVenueResponseDto = {
        items: [
          { id: "v1", name: "Venue 1", address: "", isFollowing: false } as any,
        ],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      };
      mockVenueService.searchVenues.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.searchVenues(searchDto, userId);

      // Assert
      expect(service.searchVenues).toHaveBeenCalledWith(searchDto, userId);
      // Verify controller returns what the service provides
      expect(result).toEqual(mockResponse);
    });
    // --- END NEW TEST CASE ---

    // --- NEW TEST CASE: 'forYou' without interests ---
    it("should call VenueService.searchVenues with interestId='forYou' when user has no interests", async () => {
      // Arrange
      const userId = "user-without-interests";
      const searchDto: VenueSearchDto = {
        interestId: "forYou",
      };
      const mockEmptyResponse: PaginatedVenueResponseDto = {
        items: [],
        total: 0,
        page: 1,
        limit: 10, // Default limit might be applied
        hasMore: false,
      };
      mockVenueService.searchVenues.mockResolvedValue(mockEmptyResponse);

      // Act
      const result = await controller.searchVenues(searchDto, userId);

      // Assert
      expect(service.searchVenues).toHaveBeenCalledWith(searchDto, userId);
      // Verify controller returns the empty response from the service
      expect(result).toEqual(mockEmptyResponse);
    });
    // --- END NEW TEST CASE ---

    // --- NEW TEST CASE: Standard Interest ID ---
    it("should call VenueService.searchVenues with a standard interestId", async () => {
      // Arrange
      const userId = "test-user-standard";
      const standardInterestId = "interest-abc";
      const searchDto: VenueSearchDto = {
        interestId: standardInterestId,
      };
      const mockResponse: PaginatedVenueResponseDto = {
        items: [
          { id: "v2", name: "Venue 2", address: "", isFollowing: false } as any,
        ],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      };
      mockVenueService.searchVenues.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.searchVenues(searchDto, userId);

      // Assert
      expect(service.searchVenues).toHaveBeenCalledWith(searchDto, userId);
      expect(result).toEqual(mockResponse);
    });
    // --- END NEW TEST CASE ---

    // --- NEW SKIPPED TEST CASE: Guard Denial ---
    // SKIPPED: Guard logic is not invoked when calling controller method directly.
    // This should be tested in E2E tests.
    it.skip("should throw UnauthorizedException if auth guard denies access", async () => {
      // Arrange
      const userId = "test-user-id";
      const searchDto: VenueSearchDto = { limit: 10 }; // Minimal DTO
      mockAuthGuard.canActivate.mockResolvedValue(false); // Guard denies access

      // Act & Assert
      await expect(controller.searchVenues(searchDto, userId)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify service method was NOT called
      expect(service.searchVenues).not.toHaveBeenCalled();
    });
    // --- END NEW SKIPPED TEST CASE ---
  });

  // Add describe blocks for other controller methods (getTrendingVenues, followVenue, etc.)
  // with relevant test cases.
});
