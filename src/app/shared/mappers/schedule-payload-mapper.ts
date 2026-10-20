import { Service } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CalendarShift } from '../../features/schedule/schedule';
import { SaveShiftDTO } from '../DTO/POST/SaveShiftDTO';
import { SaveWeekDTO } from '../DTO/POST/SaveWeekDTO ';
import { ShiftAssignmentDTO } from '../DTO/POST/ShiftAssignmentDTO ';
import { WeekScheduleForm } from '../services/schedule-form-service';
import { toTime } from '../utils/date-time-util';

type WeekScheduleFormValue = ReturnType<
    FormGroup<WeekScheduleForm>['getRawValue']
>;

@Service()
export class SchedulePayloadMapper {

  toSaveWeekDtoFromCalendar(
    formValue: WeekScheduleFormValue,
    weekStartDate: string,
    calendarShifts: CalendarShift[],
  ): SaveWeekDTO {
    return {
      year: formValue.year,
      weekNumber: formValue.weekNumber,
      weekStartDate,
      assignments: this.toAssignmentDtos(calendarShifts),
    };
  }

  private toAssignmentDtos(
    calendarShifts: CalendarShift[],
  ): ShiftAssignmentDTO[] {
    const grouped = new Map<number, SaveShiftDTO[]>();

    for (const shift of calendarShifts) {
      const value = shift.form.getRawValue();

      const startsAt = toTime(value.startHour, value.startMinute);
      const endsAt = toTime(value.endHour, value.endMinute);

      if (!startsAt || !endsAt) {
        continue;
      }

      const savedShift: SaveShiftDTO = {
        actualDate: value.actualDate,
        startsAt,
        endsAt,
      };

      const existing = grouped.get(shift.employeeId) ?? [];
      existing.push(savedShift);

      grouped.set(shift.employeeId, existing);
    }

    return Array.from(grouped.entries()).map(
      ([employeeId, shifts]) => ({
        employeeId,
        shifts,
      })
    );
  }
  
}
