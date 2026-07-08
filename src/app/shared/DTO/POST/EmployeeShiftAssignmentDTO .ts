import { ShiftAssignmentDTO } from "./ShiftAssignmentDTO";

export interface EmployeeShiftAssignmentDTO {
  employeeId: number;
  shifts: ShiftAssignmentDTO[];
}