import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TimePickerCoordinator } from '../../helpers/time-picker-coordinator';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TimePicker } from '../time-picker/time-picker';
import { ShiftTextPipe } from '../../pipes/shift-text-pipe';
import { EmployeeScheduleForm } from '../../services/schedule-form-service';

export type ScheduleViewMode = 'edit' | 'read';

@Component({
  selector: 'app-schedule-row',
  standalone: true,
  imports: [ReactiveFormsModule, TimePicker, ShiftTextPipe],
  templateUrl: './schedule-row.html',
  styleUrl: './schedule-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleRow {
  private readonly timePickerCoordinator = inject(TimePickerCoordinator);

  readonly assignment = input.required<FormGroup<EmployeeScheduleForm>>();
  readonly employeeIndex = input.required<number>();
  readonly viewMode = input.required<ScheduleViewMode>();
  readonly popupOnTop = input.required<boolean>();

  readonly timeFields = [
    { key: 'startHour', type: 'hour' },
    { key: 'startMinute', type: 'minute' },
    { key: 'endHour', type: 'hour' },
    { key: 'endMinute', type: 'minute' },
  ] as const;

  readonly dayIndexes = Array.from({ length: 7 }, (_, index) => index);

  closePickers(): void {
    this.timePickerCoordinator.closeAll();
  }

  get employeeName(): string {
    return this.assignment()?.get('employeeName')?.value ?? '';
  }

  get shifts(): FormArray {
    return this.assignment()?.get('shifts') as FormArray;
  }

}