import { AsyncPipe, DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, filter, Subject, switchMap, takeUntil } from 'rxjs';
import { WeekDTO } from '../../shared/DTO/GET/WeekDTO';
import { SaveWeekDTO } from '../../shared/DTO/POST/SaveWeekDTO ';
import { DemoSessionTimerPipe } from '../../shared/pipes/demo-session-timer-pipe';
import { DemoSessionHelper } from '../../shared/services/helpers/demo-session-helper';
import { ScheduleService } from '../../shared/services/http/schedule-service';
import { AlertUtil } from '../../shared/services/utils/alert-util';

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
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit, OnDestroy {
  private weekSubject = new BehaviorSubject<WeekDTO | null>(null);

  week$ = this.weekSubject.asObservable();

  readonly dayIndexes = Array.from({ length: 7 }, (_, index) => index);

  dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /**
   * Makes a new array with 24 items.
   * The underscore is just a placeholder to ignore the first argument.
   * Turns the number into a 2-digit string, so 0 becomes "00" and 9 becomes "09"
   */
  hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  minutes = ['00', '15', '30', '45'];

  private formBuilder = inject(FormBuilder);
  private scheduleService = inject(ScheduleService);
  private route = inject(ActivatedRoute);
  private alertUtil = inject(AlertUtil);

  weekScheduleForm = this.formBuilder.group({
    year: [0],
    weekNumber: [0],
    shiftAssignments: this.formBuilder.array<FormGroup>([]),
  });

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
    // 2) Load schedule when route params change
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
        console.log('Timer reached zero');

        this.alertUtil.show('Demo has expired', 'warning');

        this.reloadCurrentWeek();
      });
  }

  private loadWeekIntoForm(week: WeekDTO): void {
    this.weekSubject.next(week);
    this.currentWeekStartDate = week.startDate;

    this.weekScheduleForm.patchValue({
      year: week.year,
      weekNumber: week.weekNumber,
    });

    const assignments = this.shiftAssignmentsFormArray;
    assignments.clear();

    const assignmentByEmployeeId = new Map(week.assignments.map((a) => [a.employeeId, a]));

    for (const employee of week.employees) {
      const employeeAssignment = assignmentByEmployeeId.get(employee.employeeId);

      assignments.push(
        this.formBuilder.group({
          employeeId: [employee.employeeId],
          // employeeName: [`${employee.firstName} ${employee.lastName}`],
          employeeName: [employee.firstName],
          shifts: this.formBuilder.array(
            Array.from({ length: 7 }, (_, dayIndex) => {
              const actualDate = this.formatDateForApi(week.startDate, dayIndex);

              const savedShift = employeeAssignment?.shifts.find(
                (s) => s.actualDate === actualDate,
              );

              const start = this.splitTime(savedShift?.startsAt ?? null);
              const end = this.splitTime(savedShift?.endsAt ?? null);

              return this.formBuilder.group({
                actualDate: [actualDate],
                startHour: [start.hour],
                startMinute: [start.minute],
                endHour: [end.hour],
                endMinute: [end.minute],
              });
            }),
          ),
        }),
      );
    }
  }

  private splitTime(time: string | null): { hour: string; minute: string } {
    if (!time) {
      return { hour: '', minute: '00' };
    }
    const [hour, minute] = time.split(':');
    return { hour: hour ?? '', minute: minute ?? '00' };
  }

  private reloadCurrentWeek(): void {
    const week = this.weekSubject.getValue();

    if (!week) {
      return;
    }

    // Immediately remove the old shift values from the UI.
    this.clearScheduleForm();

    this.scheduleService
      .getWeek(week.year, week.weekNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newWeek) => {
          this.loadWeekIntoForm(newWeek);
        },
        error: (error) => {
          console.error('Could not reload schedule:', error);
        },
      });
  }

  private clearScheduleForm(): void {
    this.weekScheduleForm.reset({
      year: 0,
      weekNumber: 0,
    });

    this.shiftAssignmentsFormArray.clear();
    this.weekSubject.next(null);
    this.currentWeekStartDate = '';
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
   * TEMPLATE FUNCTION
   */
  getShifts(employeeIndex: number): FormArray {
    return this.shiftAssignmentsFormArray.at(employeeIndex).get('shifts') as FormArray;
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
    const shifts = this.getShifts(employeeIndex);
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
   * Edge case where users might type unwanted inputs.
   * This function blurs or clamps them into more secure inputs:
   * Typing 0 only → blur → 00
   * Typing 9 only → blur → 09
   * Typing 25-99 in hour input → input clamps it to 23
   */
  formatTimeInputOnBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const timeType = input.dataset['timeType'] as 'hour' | 'minute' | undefined;
    const raw = input.value.trim();

    if (!raw) {
      input.value = '';
      return;
    }

    const num = Number(raw);

    if (!/^\d{1,2}$/.test(raw)) {
      input.value = '';
      return;
    }

    if (timeType === 'hour') {
      if (num < 0 || num > 23) {
        input.value = '';
        return;
      }

      input.value = num.toString().padStart(2, '0');
    } else if (timeType === 'minute') {
      if (num < 0 || num > 59) {
        input.value = '00';
        return;
      }

      input.value = num.toString().padStart(2, '0');
    }
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

  // HELPER
  formatDateForApi(startDate: string, offset: number): string {
    const date = this.getDateForDay(startDate, offset);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

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

    this.scheduleService.saveWeek(payload).subscribe({
      next: () => {
        this.alertUtil.show('Save successful', 'success');
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

  // ===========================
  // ACCORDION UTILITY FUNCTIONS
  // ===========================

  /**
   * Accordion status flag. When a time input box is clicked
   * and focused on, this property will be filled with sub properties
   * like the index of the selected employee, day, and a fieldType(startHour,
   * startMinute, endHour, endMinute).
   */
  activeTimeInput: {
    employeeIndex: number;
    dayIndex: number;
    fieldType: 'startHour' | 'startMinute' | 'endHour' | 'endMinute';
  } | null = null;

  /**
   * Fills accordion status with required subproperties.
   */
  openTimePicker(
    employeeIndex: number,
    dayIndex: number,
    fieldType: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
  ): void {
    this.activeTimeInput = { employeeIndex, dayIndex, fieldType };
  }

  /**
   * If the flag activeTimeInput NOT null, let the user pick a time value.
   * @param value
   */
  pickTimeValue(value: string): void {
    if (!this.activeTimeInput) {
      return;
    }

    const { employeeIndex, dayIndex, fieldType } = this.activeTimeInput;

    const shiftGroup = this.getShifts(employeeIndex).at(dayIndex) as FormGroup;
    const control = shiftGroup.get(fieldType);

    control?.setValue(value);

    // Close accordion after picking
    this.activeTimeInput = null;
  }

  /**
   * Close accordion when clicking outside
   */
  closeTimePicker(): void {
    this.activeTimeInput = null;
  }

  // CONTROL BAR FUNCTIONS
  showOrHide: 'hide' | 'show' = 'show';

  toggleExpiryTimer() {
    this.showOrHide = this.showOrHide === 'show' ? 'hide' : 'show';
  }
}

@Component({
  template: '',
})
export class RedirectComponent {}
