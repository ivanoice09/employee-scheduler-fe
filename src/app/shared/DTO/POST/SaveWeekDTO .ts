import { ShiftAssignmentDTO } from "./ShiftAssignmentDTO ";


export interface SaveWeekDTO {
  year: number;
  weekNumber: number;
  weekStartDate: string;
  assignments: ShiftAssignmentDTO[];
}