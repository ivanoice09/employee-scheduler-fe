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
    '(document:focusin)': 'onDocumentFocus($event)',
  },
})
export class ScheduleRow {
  private readonly timePickerCoordinator = inject(TimePickerCoordinator);

  readonly assignment = input.required<FormGroup<EmployeeScheduleForm>>();
  readonly employeeIndex = input.required<number>();
  readonly viewMode = input.required<ScheduleViewMode>();
  readonly popupOnTop = input.required<boolean>();

  readonly dayIndexes = Array.from({ length: 7 }, (_, index) => index);

  private readonly visibleMinutes = signal<ReadonlySet<string>>(new Set());

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

  closePickers(): void {
    this.timePickerCoordinator.closeAll();
  }

  get employeeName(): string {
    return this.assignment()?.get('employeeName')?.value ?? '';
  }

  get shifts(): FormArray {
    return this.assignment()?.get('shifts') as FormArray;
  }

  isMinuteVisible(
    shift: FormGroup,
    dayIndex: number,
    minuteField: 'startMinute' | 'endMinute',
  ): boolean {
    const key = this.minuteKey(dayIndex, minuteField);

    if (this.visibleMinutes().has(key)) {
      return true;
    }

    return this.hasCustomMinute(shift, minuteField);
  }

  onTimeFocusIn(
    event: FocusEvent,
    shift: FormGroup,
    dayIndex: number,
    field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
  ): void {
    const minuteField =
      field === 'startHour' ? 'startMinute' : field === 'endHour' ? 'endMinute' : field;

    this.showMinute(dayIndex, minuteField);
  }

  onTimeFocusOut(
    event: FocusEvent,
    shift: FormGroup,
    dayIndex: number,
    field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
  ): void {
    const minuteField =
      field === 'startHour' ? 'startMinute' : field === 'endHour' ? 'endMinute' : field;

    // Keep the minute input visible if focus is moving directly into it.
    const relatedTarget = event.relatedTarget;

    if (
      relatedTarget instanceof Element &&
      relatedTarget.closest('[data-time-field]')?.getAttribute('data-time-field') === minuteField
    ) {
      return;
    }

    if (!this.hasCustomMinute(shift, minuteField)) {
      this.hideMinute(dayIndex, minuteField);
    }
  }

  private showMinute(dayIndex: number, minuteField: 'startMinute' | 'endMinute'): void {
    const key = this.minuteKey(dayIndex, minuteField);

    this.visibleMinutes.update((current) => new Set(current).add(key));
  }

  private hideMinute(dayIndex: number, minuteField: 'startMinute' | 'endMinute'): void {
    const key = this.minuteKey(dayIndex, minuteField);

    this.visibleMinutes.update((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  private minuteKey(dayIndex: number, minuteField: 'startMinute' | 'endMinute'): string {
    return `${this.employeeIndex()}-${dayIndex}-${minuteField}`;
  }

  // Row selection logic

  readonly isSelected = signal(false);

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

  private hasCustomMinute(shift: FormGroup, minuteField: 'startMinute' | 'endMinute'): boolean {
    const hourField = minuteField === 'startMinute' ? 'startHour' : 'endHour';

    const hourValue = shift.get(hourField)?.value;
    const minuteValue = shift.get(minuteField)?.value;

    const hasHour = hourValue !== null && hourValue !== undefined && hourValue !== '';
    const hasCustomMinute =
      minuteValue !== null &&
      minuteValue !== undefined &&
      minuteValue !== '' &&
      minuteValue !== '00';

    return hasHour && hasCustomMinute;
  }
}
