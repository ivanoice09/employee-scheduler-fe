import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { toTime } from '../utils/date-time-util';

@Pipe({
  name: 'shiftText',
})
export class ShiftTextPipe implements PipeTransform {
   transform(shift: AbstractControl | null): string {
    if (!shift) return 'OFF';

    const startsAt = toTime(
      shift.get('startHour')?.value,
      shift.get('startMinute')?.value,
    );

    const endsAt = toTime(
      shift.get('endHour')?.value,
      shift.get('endMinute')?.value,
    );

    return startsAt && endsAt ? `${startsAt} – ${endsAt}` : 'OFF';
  }
}
