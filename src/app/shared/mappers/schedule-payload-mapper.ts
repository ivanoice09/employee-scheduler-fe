import { Service } from '@angular/core';
import { SaveWeekDTO } from '../DTO/POST/SaveWeekDTO ';
import { FormGroup } from '@angular/forms';
import { EmployeeScheduleForm, WeekScheduleForm } from '../services/schedule-form-service';
import { toTime } from '../utils/date-time-util';
import { ShiftAssignmentDTO } from '../DTO/POST/ShiftAssignmentDTO ';
import { SaveShiftDTO } from '../DTO/POST/SaveShiftDTO';

type WeekScheduleFormValue = ReturnType<
    FormGroup<WeekScheduleForm>['getRawValue']
>;

type EmployeeScheduleFormValue = ReturnType<
    FormGroup<EmployeeScheduleForm>['getRawValue']
>;

@Service()
export class SchedulePayloadMapper {

  toSaveWeekDto(
      formValue: WeekScheduleFormValue,
      weekStartDate: string,
  ): SaveWeekDTO {
      return {
          year: formValue.year,
          weekNumber: formValue.weekNumber,
          weekStartDate,
          assignments: formValue.shiftAssignments.map((assignment) =>
              this.toAssignmentDto(assignment),
          ),
      };
  }

  private toAssignmentDto(
    assignment: EmployeeScheduleFormValue,
  ): ShiftAssignmentDTO {
    return {
      employeeId: assignment.employeeId,
      shifts: assignment.shifts
        .map((shift) => this.toShiftDto(shift))
        .filter((shift): shift is SaveShiftDTO => shift !== null),
    };
  }

  private toShiftDto(
    shift: EmployeeScheduleFormValue['shifts'][number],
  ): SaveShiftDTO | null {
    const startsAt = toTime(shift.startHour, shift.startMinute);
    const endsAt = toTime(shift.endHour, shift.endMinute);

    if (!startsAt || !endsAt) {
      return null;
    }

    return {
      actualDate: shift.actualDate,
      startsAt,
      endsAt,
    };
  }
}
