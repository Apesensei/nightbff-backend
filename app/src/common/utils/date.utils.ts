import { differenceInYears } from "date-fns";

/**
 * Calculates the age based on a birth date.
 * Handles null or undefined inputs and provides timezone-aware calculation
 * by comparing dates directly using date-fns.
 *
 * @param birthDate The birth date as a Date object, null, or undefined.
 * @returns The calculated age as a number, or null if the input is invalid.
 */
export function calculateAge(
  birthDate: Date | null | undefined,
): number | null {
  if (
    !birthDate ||
    !(birthDate instanceof Date) ||
    isNaN(birthDate.getTime())
  ) {
    // Return null if birthDate is null, undefined, not a Date object, or an invalid date
    return null;
  }

  try {
    // Get the current date
    const now = new Date();

    // Calculate the difference in full years
    const age = differenceInYears(now, birthDate);

    // Basic sanity check (age shouldn't be negative)
    return age >= 0 ? age : null;
  } catch (error) {
    // Log potential errors during calculation (optional, depends on logging strategy)
    console.error("Error calculating age:", error);
    return null;
  }
}
