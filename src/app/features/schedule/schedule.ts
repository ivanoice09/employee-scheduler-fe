import { AsyncPipe, DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, filter, finalize, Subject, switchMap, takeUntil } from 'rxjs';
import { TimePicker } from '../../shared/components/time-picker/time-picker';
import { WeekDTO } from '../../shared/DTO/GET/WeekDTO';
import { SaveWeekDTO } from '../../shared/DTO/POST/SaveWeekDTO ';
import { DemoSessionHelper } from '../../shared/helpers/demo-session-helper';
import { DemoSessionTimerPipe } from '../../shared/pipes/demo-session-timer-pipe';
import { ScheduleService } from '../../shared/services/http/schedule-service';
import { AlertUtil } from '../../shared/utils/alert-util';
import { ScheduleFormService, WeekScheduleForm } from '../../shared/services/schedule-form-service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    SlicePipe,
    UpperCasePipe,
    DemoSessionTimerPipe,
    TimePicker,
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit, OnDestroy {
  private weekSubject = new BehaviorSubject<WeekDTO | null>(null);

  week$ = this.weekSubject.asObservable();

  readonly dayIndexes = Array.from({ length: 7 }, (_, index) => index);

  dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  private formBuilder = inject(FormBuilder);
  private scheduleService = inject(ScheduleService);
  private route = inject(ActivatedRoute);
  private alertUtil = inject(AlertUtil);
  private router = inject(Router);
  private scheduleFormService = inject(ScheduleFormService);

  weekNavigationForm = this.formBuilder.group({
    weekNumber: [0, [Validators.required, Validators.min(1), Validators.max(53), integerValidator]],
  });

  changeWeek(): void {
    const weekControl = this.weekNavigationForm.get('weekNumber');

    if (!weekControl || weekControl.invalid) {
      weekControl?.markAsTouched();
      return;
    }

    const week = this.weekSubject.getValue();
    if (!week) {
      return;
    }

    const newWeekNumber = Number(weekControl.value);

    if (newWeekNumber === week.weekNumber) {
      return;
    }

    this.router.navigate(['/schedule', week.year, newWeekNumber]);
  }

  weekScheduleForm!: FormGroup<WeekScheduleForm>;

  currentWeekStartDate = '';

  /**
   * 'edit' = form with input boxes
   * 'read' = plain text (HH:MM–HH:MM or OFF)
   */
  viewMode: 'edit' | 'read' = 'edit';

  private readonly destroy$ = new Subject<void>();
  private demoSessionHelper = inject(DemoSessionHelper);
  remainingSeconds$ = this.demoSessionHelper.remainingSeconds$;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const year = Number(params.get('year'));
          const week = Number(params.get('week'));
          return this.scheduleService.getWeek(year, week);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((week) => {
        this.loadWeekIntoForm(week);
      });

    this.demoSessionHelper.remainingSeconds$
      .pipe(
        filter((seconds): seconds is number => seconds === 0),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.alertUtil.show('Demo has expired', 'warning');
        this.reloadCurrentWeek();
      });
  }

  private loadWeekIntoForm(week: WeekDTO): void {
    this.weekSubject.next(week);
    this.currentWeekStartDate = week.startDate;

    this.weekNavigationForm.patchValue({
      weekNumber: week.weekNumber,
    });

    this.weekScheduleForm = this.scheduleFormService.buildWeekForm(week);
  }

  reloading = false;

  private reloadCurrentWeek(): void {
    const week = this.weekSubject.getValue();

    if (!week || this.reloading) {
      return;
    }

    this.reloading = true;

    this.scheduleService
      .getWeek(week.year, week.weekNumber)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.reloading = false)),
      )
      .subscribe({
        next: (newWeek) => {
          this.loadWeekIntoForm(newWeek);
        },
        error: (error) => {
          console.error('Could not reload schedule:', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns the shift-assignments from the week schedule's form (FormArray)
   */
  get shiftAssignmentsFormArray(): FormArray {
    return this.weekScheduleForm.get('shiftAssignments') as FormArray;
  }

  /**
   * Get all shifts from the FormArry by passing an employee's index number.
   */
  getShiftsByEmployeeIndex(employeeIndex: number): FormArray {
    return this.shiftAssignmentsFormArray.at(employeeIndex).get('shifts') as FormArray;
  }

  /**
   * Get all shifts directly from the FormArray.
   * This is an optimization of the function above because it avoids
   * resolving the employee again by index.
   */
  shiftsOf(shiftAssignment: AbstractControl): FormArray {
    return shiftAssignment.get('shifts') as FormArray;
  }

  /**
   * Returns TRUE when week.status is not null.
   * So if the status is DRAFT, PUBLISHED, or LOCKED return TRUE.
   * If TRUE then the view toggler button is ENABLED.
   */
  get isWeekLocked(): boolean {
    const week = this.weekSubject.getValue();
    return week?.status != null;
  }

  /**
   * Toggle between 'edit' and 'read' modes.
   * Only allowed when get isWeekLocked() is TRUE.
   */
  toggleViewMode(): void {
    if (!this.isWeekLocked) {
      return;
    }
    this.viewMode = this.viewMode === 'edit' ? 'read' : 'edit';
  }

  /**
   * After getting startHour, startMinute, endHour and endMinute
   * converts them into string and joints them into (startHour, startMinute) as one
   * and (endHour, endMinute) as one and returns TWO string values (startsAt, endsAt)
   */
  getShiftForCell(
    employeeIndex: number,
    dayIndex: number,
  ): { startsAt: string | null; endsAt: string | null } | null {
    const shifts = this.getShiftsByEmployeeIndex(employeeIndex);
    const shiftGroup = shifts.at(dayIndex) as FormGroup;

    const startHour = shiftGroup.get('startHour')?.value as string;
    const startMinute = shiftGroup.get('startMinute')?.value as string;

    const endHour = shiftGroup.get('endHour')?.value as string;
    const endMinute = shiftGroup.get('endMinute')?.value as string;

    const startsAt = this.toTime(startHour, startMinute);
    const endsAt = this.toTime(endHour, endMinute);

    if (!startsAt || !endsAt) {
      return null;
    }

    return { startsAt, endsAt };
  }

  /**
   * Calls getShiftForCell() and unifies startsAt and endsAt then returns them
   * into one single string. And finally displays the string into the template.
   */
  formatShiftIntoText(employeeIndex: number, dayIndex: number): string {
    const shift = this.getShiftForCell(employeeIndex, dayIndex);
    if (!shift) {
      return 'OFF';
    }
    return `${shift.startsAt} – ${shift.endsAt}`;
  }

  /**
   * Returns a new Date calculated by adding or subtracting the specified
   * number of days from the given start date.
   *
   * The start date must use the ISO-like `YYYY-MM-DD` format, e.g. `"2026-10-12"`.
   * The month is converted from its 1-based representation (`1`–`12`) to
   * JavaScript's 0-based month index (`0`–`11`).
   *
   * @param startDate - The base date in `YYYY-MM-DD` format.
   * @param offset - The number of days to add. Use a negative value to subtract days.
   * @returns A new `Date` representing the start date shifted by `offset` days.
   *
   * @example
   * // Returns a Date representing 2026-10-15
   * getDateForDay("2026-10-12", 3);
   *
   * @example
   * // Returns a Date representing 2026-10-11
   * getDateForDay("2026-10-12", -1);
   */
  getDateForDay(startDate: string, offset: number): Date {
    const [year, month, day] = startDate.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + offset));
  }

  saving = false;

  save(): void {
    this.blurAllTimeInputs();

    const raw = this.weekScheduleForm.getRawValue();

    const payload: SaveWeekDTO = {
      year: raw.year ?? 0,
      weekNumber: raw.weekNumber ?? 0,
      weekStartDate: this.currentWeekStartDate,
      assignments: (raw.shiftAssignments ?? []).map((assignment: any) => {
        const shifts = (assignment.shifts ?? [])
          .map((shift: any) => {
            const startsAt = this.toTime(shift.startHour, shift.startMinute);
            const endsAt = this.toTime(shift.endHour, shift.endMinute);

            if (!startsAt || !endsAt) {
              return null;
            }

            return {
              actualDate: shift.actualDate,
              startsAt,
              endsAt,
            };
          })
          .filter((s: any) => s !== null);

        return {
          employeeId: assignment.employeeId,
          shifts,
        };
      }),
    };

    this.saving = true;

    this.scheduleService
      .saveWeek(payload)
      .pipe(
        // delay(600), // just to show if spinner animation works
        takeUntil(this.destroy$),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: () => {
          this.alertUtil.show('Save successful', 'success');
          this.reloadCurrentWeek();
        },
        error: (err) => console.error(err),
      });
  }

  /**
   * Even though edge case function formatTimeInputOnBlur() already exists,
   * this function still validates the input hour and minute from the FORM
   * before being SAVED.
   *
   * @param hour
   * @param minute
   * @returns a stringyfied pair of `hour`:`minute` with padding so for example
   * instead of "7" it becomes "07"
   */
  private toTime(hour: string, minute: string): string | null {
    if (!hour || !minute) {
      return null;
    }

    if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) {
      return null;
    }

    const hourNumber = Number(hour);
    const minuteNumber = Number(minute);

    if (hourNumber < 0 || hourNumber > 23) {
      return null;
    }
    if (minuteNumber < 0 || minuteNumber > 59) {
      return null;
    }

    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  /**
   * EDGE CASE FUNCTION, HELPER
   * The user might not "unfocus" one of the input box before saving,
   * so this function removes the focus and then clamp it to 00.
   */
  private blurAllTimeInputs(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[data-time-type]');
    inputs.forEach((input) => input.blur());
  }

  // ==========
  // TimePicker
  // ==========

  readonly timeFields = [
    { key: 'startHour', placeholder: 'HH', type: 'hour' },
    { key: 'startMinute', placeholder: 'MM', type: 'minute' },
    { key: 'endHour', placeholder: 'HH', type: 'hour' },
    { key: 'endMinute', placeholder: 'MM', type: 'minute' },
  ] as const;

  shouldPopupOnTop(employeeIndex: number): boolean {
    const total = this.shiftAssignmentsFormArray.controls.length;
    return total - employeeIndex <= 4;
  }

  // =====================
  // CONTROL BAR FUNCTIONS
  // =====================

  showOrHide: 'hide' | 'show' = 'show';

  toggleExpiryTimer() {
    this.showOrHide = this.showOrHide === 'show' ? 'hide' : 'show';
  }
}

// A integer validator mainly used by the week number input
function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (value == null || value === '') {
    return null;
  }

  return Number.isInteger(Number(value)) ? null : { notInteger: true };
}

@Component({
  template: '',
})
export class RedirectComponent {}
