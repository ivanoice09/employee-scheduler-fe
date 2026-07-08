import { EmployeeShiftAssignmentDTO } from "../POST/EmployeeShiftAssignmentDTO ";
import { EmployeeDTO } from "./EmployeeDTO";

export interface WeekScheduleDTO {
  year: number;
  weekNumber: number;
  startDate: string;
  status: Status;
  employees: EmployeeDTO[];
  assignments: EmployeeShiftAssignmentDTO[]
  existingWeek: boolean;
}

export enum Status {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}