/**
 * The Manila timezone identifier for PostgreSQL
 */
export const MANILA_TIMEZONE = 'Asia/Manila';

/**
 * Since we're using @db.Timestamptz, PostgreSQL automatically handles timezone conversions.
 * This function is now primarily for formatting dates in client responses.
 * The database stores all timestamps in UTC and converts them based on the timezone context.
 */
export function formatDateForClient(
  date: Date | string | null | undefined,
): Date | null {
  if (!date) {
    return null;
  }
  // Return the date as-is since Prisma and PostgreSQL handle the timezone conversion
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Convert objects with date fields for client response
 * Note: With @db.Timestamptz, this is mainly for consistency in response formatting
 */
export function formatObjectDatesForClient<T extends Record<string, any>>(
  obj: T,
  dateFields: (keyof T)[] = [
    'createdAt',
    'updatedAt',
    'startTime',
    'endTime',
    'saleDate',
    'deliveryTimeStart',
  ],
): T {
  if (!obj) return obj;

  const formatted = { ...obj } as Record<string, any>;

  // Process each property of the object
  Object.keys(formatted).forEach((key) => {
    const value = formatted[key];

    // If it's a date field, format it
    if (dateFields.includes(key as keyof T) && value) {
      formatted[key] = formatDateForClient(value as any);
    }
    // If it's an array, recursively process it
    else if (Array.isArray(value)) {
      formatted[key] = formatArrayDatesForClient(value, dateFields as any);
    }
    // If it's a nested object, recursively process it
    else if (
      value &&
      typeof value === 'object' &&
      value.constructor === Object
    ) {
      formatted[key] = formatObjectDatesForClient(value, dateFields as any);
    }
  });

  return formatted as T;
}

/**
 * Convert array items with date fields for client response
 */
export function formatArrayDatesForClient<T extends Record<string, any>>(
  array: T[],
  dateFields: (keyof T)[] = [
    'createdAt',
    'updatedAt',
    'startTime',
    'endTime',
    'saleDate',
    'deliveryTimeStart',
  ],
): T[] {
  if (!Array.isArray(array)) return array;

  return array.map((item) => formatObjectDatesForClient(item, dateFields));
}

/**
 * Create a date range for PostgreSQL queries with proper timezone handling.
 * Since we're using @db.Timestamptz, we can create proper Date objects that
 * PostgreSQL will handle correctly with timezone awareness.
 */
export function createManilaDateRangeFilter(
  startDate?: string,
  endDate?: string,
): {
  startDate?: Date;
  endDate?: Date;
} {
  if (!startDate && !endDate) {
    return {};
  }

  const result: { startDate?: Date; endDate?: Date } = {};

  if (startDate) {
    // Create start of day: YYYY-MM-DD 00:00:00 in Manila timezone
    // We interpret the input date string as Manila local time
    const startDateTime = new Date(`${startDate}T00:00:00+08:00`);
    result.startDate = startDateTime;
  }

  if (endDate) {
    // Create end of day: YYYY-MM-DD 23:59:59.999 in Manila timezone
    const endDateTime = new Date(`${endDate}T23:59:59.999+08:00`);
    result.endDate = endDateTime;
  }

  return result;
}

/**
 * Create date range for a single date in Manila timezone.
 * This is the main function you should use for YYYY-MM-DD date filtering.
 */
export function createManilaDateFilter(dateString?: string): {
  gte: Date;
  lte: Date;
} {
  if (!dateString) {
    // Return today's date range in Manila timezone
    const today = getCurrentManilaDate();
    const { startDate, endDate } = createManilaDateRangeFilter(today, today);
    return { gte: startDate!, lte: endDate! };
  }

  const { startDate, endDate } = createManilaDateRangeFilter(
    dateString,
    dateString,
  );
  return { gte: startDate!, lte: endDate! };
}

/**
 * For backward compatibility and simpler cases where you need JavaScript Date objects.
 * Use this when you can't use the PostgreSQL AT TIME ZONE approach.
 */
export function parseDateInManilaTimezone(dateString: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  // Parse date as YYYY-MM-DD and create Manila timezone dates
  const [year, month, day] = dateString.split('-').map(Number);

  // Create dates in Manila timezone context
  // Note: We'll create them as local dates and then adjust
  const baseDate = new Date(year, month - 1, day);

  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(baseDate);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/**
 * Get current date in Manila timezone for date range queries
 */
export function getCurrentManilaDate(): string {
  // Get current time and format as YYYY-MM-DD in Manila timezone
  const now = new Date();
  // This is a simplified approach - for production, consider using a proper timezone library
  const manilaOffset = 8 * 60; // Manila is UTC+8
  const manilaTime = new Date(now.getTime() + manilaOffset * 60 * 1000);
  return manilaTime.toISOString().split('T')[0];
}

/**
 * Create a date range query for "today" in Manila timezone
 */
export function createTodayManilaFilter(): {
  gte: Date;
  lte: Date;
} {
  const today = getCurrentManilaDate();
  return createManilaDateFilter(today);
}

/**
 * Legacy function - use createManilaDateFilter instead
 * @deprecated Use createManilaDateFilter for new implementations
 */
export function getManilaDateRangeForQuery(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const targetDate = dateString || getCurrentManilaDate();
  const { startOfDay, endOfDay } = parseDateInManilaTimezone(targetDate);
  return { startOfDay, endOfDay };
}

/**
 * Legacy compatibility functions - these maintain the old API but use the new timezone-aware logic
 */

/**
 * @deprecated Use formatDateForClient instead
 */
export function convertToManilaTime(
  date: Date | string | null | undefined,
): Date | null {
  return formatDateForClient(date);
}

/**
 * @deprecated Use formatObjectDatesForClient instead
 */
export function convertObjectDatesToManilaTime<T extends Record<string, any>>(
  obj: T,
  dateFields: (keyof T)[] = [
    'createdAt',
    'updatedAt',
    'startTime',
    'endTime',
    'saleDate',
    'deliveryTimeStart',
  ],
): T {
  return formatObjectDatesForClient(obj, dateFields);
}

/**
 * @deprecated Use formatArrayDatesForClient instead
 */
export function convertArrayDatesToManilaTime<T extends Record<string, any>>(
  array: T[],
  dateFields: (keyof T)[] = [
    'createdAt',
    'updatedAt',
    'startTime',
    'endTime',
    'saleDate',
    'deliveryTimeStart',
  ],
): T[] {
  return formatArrayDatesForClient(array, dateFields);
}

/**
 * @deprecated Use createManilaDateRangeFilter instead
 */
export function parseManilaDateRange(
  startDate?: string,
  endDate?: string,
): {
  startDate?: Date;
  endDate?: Date;
} {
  return createManilaDateRangeFilter(startDate, endDate);
}

/**
 * @deprecated Use createManilaDateFilter instead
 */
export function parseManilaDateToUTCRange(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const targetDate = dateString || getCurrentManilaDate();
  return parseDateInManilaTimezone(targetDate);
}

/**
 * @deprecated Use createManilaDateRangeFilter instead
 */
export function parseManilaDateRangeToUTC(
  startDateString?: string,
  endDateString?: string,
): {
  startDate: Date;
  endDate: Date;
} {
  const range = createManilaDateRangeFilter(startDateString, endDateString);
  const today = getCurrentManilaDate();
  const todayRange = createManilaDateRangeFilter(today, today);

  return {
    startDate: range.startDate || todayRange.startDate!,
    endDate: range.endDate || todayRange.endDate!,
  };
}

/**
 * @deprecated With @db.Timestamptz, you can store dates directly
 */
export function parseManilaDateForStorage(dateString?: string): Date {
  if (!dateString) {
    return new Date();
  }
  return new Date(`${dateString}T00:00:00+08:00`);
}

/**
 * @deprecated Use formatDateForClient instead
 */
export function formatManilaDateTime(
  date: Date | string | null | undefined,
): Date | null {
  return formatDateForClient(date);
}
