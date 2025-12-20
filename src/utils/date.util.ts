export function convertToManilaTime(
  date: Date | string | null | undefined,
): Date | null {
  if (!date) {
    return null;
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Add 8 hours to convert UTC to Philippine Time (UTC +8)
  const manilaTime = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
  return manilaTime;
}

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
  if (!obj) return obj;

  const converted = { ...obj } as Record<string, any>;

  // Process each property of the object
  Object.keys(converted).forEach((key) => {
    const value = converted[key];

    // If it's a date field, convert it
    if (dateFields.includes(key as keyof T) && value) {
      converted[key] = convertToManilaTime(value as any);
    }
    // If it's an array, recursively process it
    else if (Array.isArray(value)) {
      converted[key] = convertArrayDatesToManilaTime(value, dateFields as any);
    }
    // If it's a nested object, recursively process it
    else if (
      value &&
      typeof value === 'object' &&
      value.constructor === Object
    ) {
      converted[key] = convertObjectDatesToManilaTime(value, dateFields as any);
    }
  });

  return converted as T;
}

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
  if (!Array.isArray(array)) return array;

  return array.map((item) => convertObjectDatesToManilaTime(item, dateFields));
}

export function parseManilaDateRange(
  startDate?: string,
  endDate?: string,
): {
  startDate?: Date;
  endDate?: Date;
} {
  if (!startDate && !endDate) {
    return {};
  }

  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate) {
    // Parse "YYYY-MM-DD" format
    const parts = startDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    // Manila start of day to UTC
    start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  }

  if (endDate) {
    // Parse "YYYY-MM-DD" format
    const parts = endDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    // Manila end of day to UTC
    end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);
  }

  return { startDate: start, endDate: end };
}

export function parseManilaDateToUTC(dateString: string): Date {
  // Parse "YYYY-MM-DD" format and convert Manila midnight to UTC
  const parts = dateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  // Manila midnight to UTC (subtract 8 hours)
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
}

export function getManilaDateBounds(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  let year: number, month: number, day: number;
  
  if (dateString) {
    const parts = dateString.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    const nowInManila = new Date(Date.now() + 8 * 60 * 60 * 1000);
    year = nowInManila.getUTCFullYear();
    month = nowInManila.getUTCMonth();
    day = nowInManila.getUTCDate();
  }

  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);

  return { startOfDay, endOfDay };
}

export function parseManilaDateToUTCRange(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  // Parse the date string to get year, month, day components
  let year: number, month: number, day: number;
  
  if (dateString) {
    const parts = dateString.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    const nowInManila = new Date(Date.now() + 8 * 60 * 60 * 1000);
    year = nowInManila.getUTCFullYear();
    month = nowInManila.getUTCMonth();
    day = nowInManila.getUTCDate();
  }

  // Manila midnight to UTC
  const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);

  return {
    startOfDay: startOfDayUTC,
    endOfDay: endOfDayUTC,
  };
}

export function parseManilaDateRangeToUTC(
  startDateString?: string,
  endDateString?: string,
): {
  startDate: Date;
  endDate: Date;
} {
  let startDate: Date;
  let endDate: Date;

  if (startDateString) {
    const parts = startDateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  } else {
    // Default to today's start in Manila Time
    const nowInManila = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const year = nowInManila.getUTCFullYear();
    const month = nowInManila.getUTCMonth();
    const day = nowInManila.getUTCDate();
    startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  }

  if (endDateString) {
    const parts = endDateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);
  } else {
    // Default to today's end in Manila Time
    const nowInManila = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const year = nowInManila.getUTCFullYear();
    const month = nowInManila.getUTCMonth();
    const day = nowInManila.getUTCDate();
    endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

export function parseManilaDateForStorage(dateString?: string): Date {
  if (!dateString) {
    // Current Manila time converted to UTC for storage
    const now = new Date();
    return new Date(now.getTime() - 8 * 60 * 60 * 1000);
  }

  // Parse the date string as Manila time and convert to UTC for storage
  const manilaDate = new Date(dateString);
  return new Date(manilaDate.getTime() - 8 * 60 * 60 * 1000);
}

export function getManilaDateRangeForQuery(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  // Parse the date string to get year, month, day components
  // This is timezone-independent
  let year: number, month: number, day: number;
  
  if (dateString) {
    // Parse "YYYY-MM-DD" format
    const parts = dateString.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    day = parseInt(parts[2], 10);
  } else {
    // Use current date in Manila timezone
    // Manila is UTC+8, so we add 8 hours to get Manila time
    const nowInManila = new Date(Date.now() + 8 * 60 * 60 * 1000);
    year = nowInManila.getUTCFullYear();
    month = nowInManila.getUTCMonth();
    day = nowInManila.getUTCDate();
  }

  // Create start of day 00:00:00.000 in Manila timezone
  // Manila is UTC+8, so Manila midnight = UTC 16:00 previous day
  // e.g., Manila 2024-12-20 00:00:00 = UTC 2024-12-19 16:00:00
  const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  
  // Create end of day 23:59:59.999 in Manila timezone
  // e.g., Manila 2024-12-20 23:59:59 = UTC 2024-12-20 15:59:59
  const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000);

  return {
    startOfDay: startOfDayUTC,
    endOfDay: endOfDayUTC,
  };
}
