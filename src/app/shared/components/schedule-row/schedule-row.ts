import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TimePickerCoordinator } from '../../helpers/time-picker-coordinator';
import { ShiftTextPipe } from '../../pipes/shift-text-pipe';
import { EmployeeScheduleForm } from '../../services/schedule-form-service';
import { TimePicker } from '../time-picker/time-picker';

export type ScheduleViewMode = 'edit' | 'read';

@Component({
  selector: 'app-schedule-row',
  standalone: true,
  imports: [ReactiveFormsModule, TimePicker, ShiftTextPipe],
  templateUrl: './schedule-row.html',
  styleUrl: './schedule-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.row-selected]': 'isSelected()',
    '(focusin)': 'onRowFocus($event)',
    '(document:focusin)': 'onDocumentFocus($event)'
  }
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

  // Highlight row:

  readonly isSelected = signal(false);

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const handleClick = (event: MouseEvent): void => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const clickedRow = target.closest('app-schedule-row');

      // Clicking outside every employee row clears the selection.
      if (!clickedRow) {
        this.isSelected.set(false);
        return;
      }

      // Clicking an input selects its row and deselects other rows.
      if (target.closest('input')) {
        this.isSelected.set(clickedRow === this.hostElement.nativeElement);
      }

      // Clicking a picker option or another part of a row
      // leaves the current selection unchanged.
    };

    this.document.addEventListener('click', handleClick, true);

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('click', handleClick, true);
    });
  }

  onRowFocus(event: FocusEvent): void {
    if (event.target instanceof HTMLInputElement) {
      this.isSelected.set(true);
    }
  }

  onDocumentFocus(event: FocusEvent): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const focusedRow = target.closest('app-schedule-row');

    if (focusedRow && focusedRow !== this.hostElement.nativeElement) {
      this.isSelected.set(false);
    }
  }
}
