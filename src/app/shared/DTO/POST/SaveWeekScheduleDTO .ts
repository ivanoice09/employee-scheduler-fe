import { EmployeeShiftAssignmentDTO } from "./EmployeeShiftAssignmentDTO ";

export interface SaveWeekScheduleDTO {
  year: number;
  weekNumber: number;
  weekStartDate: string;
  assignments: EmployeeShiftAssignmentDTO[];
}