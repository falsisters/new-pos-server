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

  const converted = { ...obj };

  dateFields.forEach((field) => {
    if (converted[field]) {
      converted[field] = convertToManilaTime(converted[field] as any) as any;
    }
  });

  return converted;
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
    // Parse the date string and treat it as Manila Time
    const startManilaDate = new Date(startDate);
    // Convert Manila Time to UTC by subtracting 8 hours
    start = new Date(startManilaDate.getTime() - 8 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0); // Set to start of day in UTC
  }

  if (endDate) {
    // Parse the date string and treat it as Manila Time
    const endManilaDate = new Date(endDate);
    // Convert Manila Time to UTC by subtracting 8 hours
    end = new Date(endManilaDate.getTime() - 8 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999); // Set to end of day in UTC
  }

  return { startDate: start, endDate: end };
}

export function parseManilaDateToUTC(dateString: string): Date {
  // Parse the date string and treat it as Manila Time
  const manilaDate = new Date(dateString);
  // Convert Manila Time to UTC by subtracting 8 hours
  return new Date(manilaDate.getTime() - 8 * 60 * 60 * 1000);
}

export function getManilaDateBounds(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const targetDate = dateString ? parseManilaDateToUTC(dateString) : new Date();

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

export function parseManilaDateToUTCRange(dateString?: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const targetDate = dateString ? new Date(dateString) : new Date();

  // Create Manila Time dates
  const startOfDayManila = new Date(targetDate);
  startOfDayManila.setHours(0, 0, 0, 0);

  const endOfDayManila = new Date(targetDate);
  endOfDayManila.setHours(23, 59, 59, 999);

  // Convert Manila Time to UTC by subtracting 8 hours
  const startOfDayUTC = new Date(
    startOfDayManila.getTime() - 8 * 60 * 60 * 1000,
  );
  const endOfDayUTC = new Date(endOfDayManila.getTime() - 8 * 60 * 60 * 1000);

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
    const startDateManila = new Date(startDateString);
    startDateManila.setHours(0, 0, 0, 0);
    startDate = new Date(startDateManila.getTime() - 8 * 60 * 60 * 1000);
  } else {
    // Default to today's start in Manila Time
    const todayManila = new Date();
    todayManila.setHours(0, 0, 0, 0);
    startDate = new Date(todayManila.getTime() - 8 * 60 * 60 * 1000);
  }

  if (endDateString) {
    const endDateManila = new Date(endDateString);
    endDateManila.setHours(23, 59, 59, 999);
    endDate = new Date(endDateManila.getTime() - 8 * 60 * 60 * 1000);
  } else {
    // Default to today's end in Manila Time
    const todayManila = new Date();
    todayManila.setHours(23, 59, 59, 999);
    endDate = new Date(todayManila.getTime() - 8 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}
