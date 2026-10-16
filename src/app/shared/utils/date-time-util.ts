
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

export function toTime(hour: string, minute: string): string | null {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null;

  const h = Number(hour);
  const m = Number(minute);

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}