import { Service } from '@angular/core';
import { SaveWeekDTO } from '../DTO/POST/SaveWeekDTO ';
import { FormGroup } from '@angular/forms';
import { EmployeeScheduleForm, WeekScheduleForm } from '../services/schedule-form-service';
import { toTime } from '../utils/date-time-util';

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
  ): SaveWeekDTO['assignments'][number] {
    return {
      employeeId: assignment.employeeId,
      shifts: assignment.shifts
        .map((shift) => this.toShiftDto(shift))
        .filter((shift): shift is NonNullable<typeof shift> => shift !== null),
    };
  }

  private toShiftDto(
    shift: EmployeeScheduleFormValue['shifts'][number],
  ): SaveWeekDTO['assignments'][number]['shifts'][number] | null {
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
