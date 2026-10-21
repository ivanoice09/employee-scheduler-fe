export interface ShiftDTO {
    shiftId?: number;
    employeeId?: number;
    actualDate: string;
    startsAt: string | null;
    endsAt: string | null;
}