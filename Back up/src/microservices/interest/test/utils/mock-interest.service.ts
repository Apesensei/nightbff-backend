import { InterestService } from "../../services/interest.service";
// import { InterestRepository } from "../../repositories/interest.repository"; // Import needed if mocking methods that use it

// Creates a Jest mock object for the InterestService
// with common methods stubbed.
// Using Partial<InterestService> might be simpler if not strictly mocking every method as jest.Mock
export const createMockInterestService = (): Partial<InterestService> => ({
  // getEventIdsByInterest: jest.fn().mockResolvedValue([]), // TODO: Add when method exists
  getEventInterests: jest.fn().mockResolvedValue([]),
  updateEventInterests: jest.fn().mockResolvedValue(undefined),
  getUserInterests: jest.fn().mockResolvedValue([]),
  getInterestById: jest.fn().mockResolvedValue(undefined),
  // Add other methods used across tests as needed
});
