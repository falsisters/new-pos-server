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
