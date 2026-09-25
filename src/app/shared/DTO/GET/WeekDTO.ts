import { ShiftAssignmentDTO } from "../POST/ShiftAssignmentDTO ";
import { EmployeeDTO } from "./EmployeeDTO";

export interface WeekDTO {
  year: number;
  weekNumber: number;
  startDate: string;
  status: Status | null;
  employees: EmployeeDTO[];
  assignments: ShiftAssignmentDTO[];
  existingWeek: boolean;
}

export enum Status {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}