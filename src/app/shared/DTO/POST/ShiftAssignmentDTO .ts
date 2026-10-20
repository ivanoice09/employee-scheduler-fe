import { SaveShiftDTO } from "./SaveShiftDTO";

export interface ShiftAssignmentDTO {
  employeeId: number;
  shifts: SaveShiftDTO [];
}