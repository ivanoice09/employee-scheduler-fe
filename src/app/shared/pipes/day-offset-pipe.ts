import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dayOffset',
})
export class DayOffsetPipe implements PipeTransform {
  transform(startDate: string, offset: number): Date {
    const [year, month, day] = startDate.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day + offset));
  }
}
