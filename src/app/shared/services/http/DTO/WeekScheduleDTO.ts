export interface WeekScheduleDTO {
  year: number;
  weekNumber: number;
  startDate: string;
  status: Status;
}

export enum Status {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}