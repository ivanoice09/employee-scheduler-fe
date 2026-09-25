import { ShiftDTO } from "./ShiftDTO";

export interface ShiftAssignmentDTO {
  employeeId: number;
  shifts: ShiftDTO[];
}