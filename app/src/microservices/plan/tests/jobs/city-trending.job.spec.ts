import { Test, TestingModule } from "@nestjs/testing";
import { ScheduleModule } from "@nestjs/schedule";
import { CityTrendingJob } from "../../jobs/city-trending.job";
import { CityRepository } from "../../repositories/city.repository";
import { City } from "../../entities/city.entity";
import { Logger } from "@nestjs/common";
import { UpdateResult } from "typeorm";

// Mocks
const mockCityRepository = {
  findAll: jest.fn(),
  updateTrendingScore: jest.fn(),
};

// Mock Data
const mockCity1: City = { id: "city-1", name: "City A", planCount: 10 } as City;
const mockCity2: City = { id: "city-2", name: "City B", planCount: 5 } as City;
const mockCity3: City = { id: "city-3", name: "City C", planCount: 20 } as City;

// Spy on Logger methods - defined globally
let loggerErrorSpy: jest.SpyInstance;
let loggerWarnSpy: jest.SpyInstance;
let loggerLogSpy: jest.SpyInstance;

describe("CityTrendingJob", () => {
  let job: CityTrendingJob;
  let repository: CityRepository;

  beforeAll(() => {
    // Spy on the prototype before any tests run
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => {});
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    loggerLogSpy = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => {});
  });

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear mocks before each test

    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        CityTrendingJob,
        { provide: CityRepository, useValue: mockCityRepository },
        Logger, // Provide the base Logger class
      ],
    }).compile();

    job = module.get<CityTrendingJob>(CityTrendingJob);
    repository = module.get<CityRepository>(CityRepository);
    (job as any).isJobRunning = false; // Reset internal flag

    // Spies are now attached to the prototype in beforeAll
  });

  afterAll(() => {
    // Restore original methods after all tests
    loggerWarnSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  it("should be defined", () => {
    expect(job).toBeDefined();
  });

  it("should skip execution if already running", async () => {
    // Arrange
    // Simulate the job starting once
    job.handleCron(); // Don't await the first call, let it run
    // No need to mock repository for this test, we just care about the lock

    // Act
    // Immediately try to run it again
    await job.handleCron();

    // Assert
    // Check the WARN spy
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Previous trending score calculation is still running. Skipping this cycle.",
      ),
    );
    // We can't reliably assert that findAll was *not* called because the first
    // handleCron might have already called it before the second one checked the lock.
    // The main point is verifying the warning log.
  });

  it("should process cities and update scores successfully", async () => {
    // Arrange
    mockCityRepository.findAll.mockResolvedValue([
      mockCity1,
      mockCity2,
      mockCity3,
    ]);
    mockCityRepository.updateTrendingScore.mockResolvedValue({
      affected: 1,
      raw: {},
      generatedMaps: [],
    });

    // Act
    await job.handleCron();

    // Assert
    expect(mockCityRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledTimes(3);
    // Check score calculation (currently just planCount)
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledWith(
      mockCity1.id,
      mockCity1.planCount,
    );
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledWith(
      mockCity2.id,
      mockCity2.planCount,
    );
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledWith(
      mockCity3.id,
      mockCity3.planCount,
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Starting calculation"),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Found 3 cities`),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Finished calculating city trending scores. Updated: 3, Errors: 0`,
      ),
    );
    expect((job as any).isJobRunning).toBe(false); // Check lock is released
  });

  it("should handle case with no cities found", async () => {
    // Arrange
    mockCityRepository.findAll.mockResolvedValue([]); // No cities

    // Act
    await job.handleCron();

    // Assert
    expect(mockCityRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockCityRepository.updateTrendingScore).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Found 0 cities"),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Finished calculating city trending scores. Updated: 0, Errors: 0",
      ),
    );
    expect((job as any).isJobRunning).toBe(false);
  });

  it("should handle error when fetching cities", async () => {
    // Arrange
    const fetchError = new Error("DB connection failed");
    mockCityRepository.findAll.mockRejectedValue(fetchError);

    // Act
    await job.handleCron();

    // Assert
    expect(mockCityRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockCityRepository.updateTrendingScore).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Critical error during city trending score calculation",
      ),
      fetchError.stack,
    );
    expect((job as any).isJobRunning).toBe(false); // Ensure lock released even on critical error
  });

  it("should handle errors updating individual city scores but continue processing others", async () => {
    // Arrange
    const updateError = new Error("Failed to update city-2 score");
    mockCityRepository.findAll.mockResolvedValue([
      mockCity1,
      mockCity2,
      mockCity3,
    ]);
    mockCityRepository.updateTrendingScore
      .mockResolvedValueOnce({ affected: 1, raw: {}, generatedMaps: [] }) // city-1 succeeds
      .mockRejectedValueOnce(updateError) // city-2 fails
      .mockResolvedValueOnce({ affected: 1, raw: {}, generatedMaps: [] }); // city-3 succeeds

    // Act
    await job.handleCron();

    // Assert
    expect(mockCityRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledTimes(3);
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledWith(
      mockCity1.id,
      mockCity1.planCount,
    );
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledWith(
      mockCity2.id,
      mockCity2.planCount,
    );
    expect(mockCityRepository.updateTrendingScore).toHaveBeenCalledWith(
      mockCity3.id,
      mockCity3.planCount,
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to update trending score for city city-2",
      ),
      updateError.stack,
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Finished calculating city trending scores. Updated: 2, Errors: 1",
      ),
    );
    expect((job as any).isJobRunning).toBe(false);
  });

  describe("handleCron", () => {
    it("should fetch cities, calculate scores, update repository, and log correctly", async () => {
      // Arrange
      const citiesToProcess = [mockCity1, mockCity2, mockCity3];
      mockCityRepository.findAll.mockResolvedValue(citiesToProcess);
      mockCityRepository.updateTrendingScore.mockResolvedValue(
        {} as UpdateResult,
      );

      // Act
      await job.handleCron();

      // Assert
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.updateTrendingScore).toHaveBeenCalledTimes(
        citiesToProcess.length,
      );
      expect(repository.updateTrendingScore).toHaveBeenCalledWith(
        mockCity1.id,
        mockCity1.planCount,
      );
      expect(repository.updateTrendingScore).toHaveBeenCalledWith(
        mockCity2.id,
        mockCity2.planCount,
      );
      expect(repository.updateTrendingScore).toHaveBeenCalledWith(
        mockCity3.id,
        mockCity3.planCount,
      );
      // Check log messages
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Starting calculation of city trending scores"),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Found ${citiesToProcess.length} cities to process`,
        ),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Finished calculating city trending scores. Updated: ${citiesToProcess.length}, Errors: 0`,
        ),
      );
      expect((job as any).isJobRunning).toBe(false); // Check flag reset
    });

    it("should handle case with no cities found", async () => {
      // Arrange
      mockCityRepository.findAll.mockResolvedValue([]);

      // Act
      await job.handleCron();

      // Assert
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.updateTrendingScore).not.toHaveBeenCalled();
      // Check log messages
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Found 0 cities to process"),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Finished calculating city trending scores. Updated: 0, Errors: 0",
        ),
      );
      expect((job as any).isJobRunning).toBe(false);
    });

    it("should handle error during findAll and log correctly", async () => {
      // Arrange
      const dbError = new Error("DB findAll error");
      mockCityRepository.findAll.mockRejectedValue(dbError);

      // Act
      await job.handleCron();

      // Assert
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.updateTrendingScore).not.toHaveBeenCalled();
      // Check error log message
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Critical error during city trending score calculation",
        ),
        dbError.stack,
      );
      expect((job as any).isJobRunning).toBe(false); // Ensure flag reset even on error
    });

    it("should handle error during updateTrendingScore, log correctly, and continue", async () => {
      // Arrange
      const updateError = new Error("DB update error");
      const citiesToProcess = [mockCity1, mockCity2, mockCity3];
      mockCityRepository.findAll.mockResolvedValue(citiesToProcess);
      mockCityRepository.updateTrendingScore
        .mockResolvedValueOnce({} as UpdateResult) // City 1 OK
        .mockRejectedValueOnce(updateError) // City 2 Error
        .mockResolvedValueOnce({} as UpdateResult); // City 3 OK

      // Act
      await job.handleCron();

      // Assert
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.updateTrendingScore).toHaveBeenCalledTimes(
        citiesToProcess.length,
      );
      // Check error log for the failed city
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to update trending score for city ${mockCity2.id} (${mockCity2.name})`,
        ),
        updateError.stack,
      );
      // Check final summary log
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Finished calculating city trending scores. Updated: 2, Errors: 1`,
        ),
      );
      expect((job as any).isJobRunning).toBe(false); // Ensure flag reset
    });
  });
});
