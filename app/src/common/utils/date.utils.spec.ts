import { calculateAge } from "./date.utils";

describe("calculateAge", () => {
  // Use fake timers to control the current date
  beforeAll(() => {
    jest.useFakeTimers();
    // Set a fixed "current" date for all tests in this suite
    jest.setSystemTime(new Date("2024-07-26T10:00:00.000Z"));
  });

  afterAll(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  it("should return null for null input", () => {
    expect(calculateAge(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(calculateAge(undefined)).toBeNull();
  });

  it("should return null for invalid Date object", () => {
    expect(calculateAge(new Date("invalid-date-string"))).toBeNull();
  });

  it("should calculate age correctly for someone born in 1994", () => {
    const birthDate = new Date("1994-03-15T00:00:00.000Z");
    expect(calculateAge(birthDate)).toBe(30);
  });

  it("should calculate age correctly for someone who just turned 18 today", () => {
    // Born exactly 18 years before the mocked system time
    const birthDate = new Date("2006-07-26T00:00:00.000Z");
    expect(calculateAge(birthDate)).toBe(18);
  });

  it("should calculate age as 17 for someone whose 18th birthday is tomorrow", () => {
    // Born 18 years before the mocked system time + 1 day
    const birthDate = new Date("2006-07-27T00:00:00.000Z");
    expect(calculateAge(birthDate)).toBe(17);
  });

  it("should handle birth dates later in the current year", () => {
    // Born in Jan 2000, testing in July 2024 -> should be 24
    const birthDate = new Date("2000-01-10T00:00:00.000Z");
    expect(calculateAge(birthDate)).toBe(24);
  });

  it("should handle birth dates earlier in the current year", () => {
    // Born in Oct 1999, testing in July 2024 -> should be 24
    const birthDate = new Date("1999-10-20T00:00:00.000Z");
    expect(calculateAge(birthDate)).toBe(24);
  });

  // Add more edge cases if necessary (e.g., leap years affecting the exact day, although differenceInYears handles this)
});
