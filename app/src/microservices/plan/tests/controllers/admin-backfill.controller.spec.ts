import { Test, TestingModule } from "@nestjs/testing";
import { AdminBackfillController } from "../../controllers/admin-backfill.controller";
import { VenueCityBackfillJob } from "../../jobs/venue-city-backfill.job";
import { EventCityBackfillJob } from "../../jobs/event-city-backfill.job";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../auth/guards/roles.guard";
import { Reflector } from "@nestjs/core";
import {
  ExecutionContext,
  HttpStatus,
  Logger,
  InternalServerErrorException,
  ConflictException,
} from "@nestjs/common";

// Mocks
const mockVenueBackfillJob = {
  runBackfill: jest.fn(),
};
const mockEventBackfillJob = {
  runBackfill: jest.fn(),
};

// Mock guards to allow access
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockRolesGuard = { canActivate: jest.fn(() => true) };

// No Mock Response needed as controller doesn't use @Res()

describe("AdminBackfillController", () => {
  let controller: AdminBackfillController;
  let venueJob: VenueCityBackfillJob;
  let eventJob: EventCityBackfillJob;

  beforeEach(async () => {
    // Clear regular mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBackfillController],
      providers: [
        { provide: VenueCityBackfillJob, useValue: mockVenueBackfillJob },
        { provide: EventCityBackfillJob, useValue: mockEventBackfillJob },
        { provide: Reflector, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AdminBackfillController>(AdminBackfillController);
    venueJob = module.get<VenueCityBackfillJob>(VenueCityBackfillJob);
    eventJob = module.get<EventCityBackfillJob>(EventCityBackfillJob);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("triggerVenueBackfill", () => {
    it("should call job.runBackfill and return success message", async () => {
      // Arrange
      mockVenueBackfillJob.runBackfill.mockResolvedValue({
        processed: 10,
        updated: 8,
        failed: 2,
      });
      // Expect the NEW success message
      const expectedResponse = {
        message:
          "Venue city backfill job finished or already completed without errors reported synchronously.",
      };

      // Act
      const result = await controller.triggerVenueBackfill();

      // Assert
      expect(venueJob.runBackfill).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it('should re-throw ConflictException if job throws "already running" error', async () => {
      // Arrange
      const alreadyRunningError = new ConflictException(
        "Job already in progress",
      );
      mockVenueBackfillJob.runBackfill.mockRejectedValue(alreadyRunningError);

      // Act & Assert
      // Expect the controller to re-throw the exact ConflictException
      await expect(controller.triggerVenueBackfill()).rejects.toThrow(
        alreadyRunningError,
      );
      expect(venueJob.runBackfill).toHaveBeenCalledTimes(1);
    });

    it("should re-throw InternalServerErrorException for other job errors", async () => {
      // Arrange
      const otherError = new Error("Some other error");
      mockVenueBackfillJob.runBackfill.mockRejectedValue(otherError);
      const loggerSpy = jest.spyOn(controller["logger"], "warn"); // Spy on controller logger

      // Define the expected wrapped error
      const expectedWrappedError = new InternalServerErrorException(
        `Venue backfill job failed: ${otherError.message}`,
      );

      // Act & Assert
      // Expect the controller to throw the wrapped InternalServerErrorException
      await expect(controller.triggerVenueBackfill()).rejects.toThrow(
        expectedWrappedError,
      );

      expect(venueJob.runBackfill).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        `Venue backfill job failed: ${otherError.message}`,
      ); // Verify logging
      loggerSpy.mockRestore();
    });
  });

  describe("triggerEventBackfill", () => {
    it("should call job.runBackfill and return success message", async () => {
      // Arrange
      mockEventBackfillJob.runBackfill.mockResolvedValue({
        processed: 5,
        updated: 5,
        failed: 0,
      });
      // Expect the NEW success message
      const expectedResponse = {
        message:
          "Event city backfill job finished or already completed without errors reported synchronously.",
      };

      // Act
      const result = await controller.triggerEventBackfill();

      // Assert
      expect(eventJob.runBackfill).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it('should re-throw ConflictException if job throws "already running" error', async () => {
      // Arrange
      const alreadyRunningError = new ConflictException(
        "Job already in progress",
      );
      mockEventBackfillJob.runBackfill.mockRejectedValue(alreadyRunningError);

      // Act & Assert
      // Expect the controller to re-throw the exact ConflictException
      await expect(controller.triggerEventBackfill()).rejects.toThrow(
        alreadyRunningError,
      );

      expect(eventJob.runBackfill).toHaveBeenCalledTimes(1);
    });

    it("should re-throw InternalServerErrorException for other job errors", async () => {
      // Arrange
      const otherError = new Error("Some other event error");
      mockEventBackfillJob.runBackfill.mockRejectedValue(otherError);
      const loggerSpy = jest.spyOn(controller["logger"], "warn");

      // Define the expected wrapped error
      const expectedWrappedError = new InternalServerErrorException(
        `Event backfill job failed: ${otherError.message}`,
      );

      // Act & Assert
      // Expect the controller to throw the wrapped InternalServerErrorException
      await expect(controller.triggerEventBackfill()).rejects.toThrow(
        expectedWrappedError,
      );

      expect(eventJob.runBackfill).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        `Event backfill job failed: ${otherError.message}`,
      );
      loggerSpy.mockRestore();
    });
  });
});
