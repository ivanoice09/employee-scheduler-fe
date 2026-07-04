import { ShiftDTO } from "./ShiftDTO";

export interface EmployeeScheduleDTO {
    employeeId: number
    firstName: string;
    middleName: string;
    lastName: string;
    shiftDTOList: ShiftDTO[];
}