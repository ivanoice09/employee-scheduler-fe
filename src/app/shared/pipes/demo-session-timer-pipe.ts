import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'demoSessionTimer',
})
export class DemoSessionTimerPipe implements PipeTransform {
  transform(totalSeconds: number | null): string {
    if (totalSeconds == null) {
      return '';
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
