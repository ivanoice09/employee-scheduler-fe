
export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function splitTime(time: string | null) {
  if (!time) return { hour: '', minute: '00' };

  const [hour = '', minute = '00'] = time.split(':');
  return { hour, minute };
}

export function toTime(
  hour: string | number | null | undefined,
  minute: string | number | null | undefined,
): string | null {
  const normalizedHour = normalizeTimePart(hour, 23);
  const normalizedMinute = normalizeTimePart(minute, 59);

  if (normalizedHour === null || normalizedMinute === null) {
    return null;
  }

  return `${normalizedHour.padStart(2, '0')}:${normalizedMinute.padStart(2, '0')}`;
}

function normalizeTimePart(
  value: string | number | null | undefined,
  max: number,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  const integer = Math.trunc(numericValue);

  if (integer < 0 || integer > max) {
    return null;
  }

  return String(integer);
}