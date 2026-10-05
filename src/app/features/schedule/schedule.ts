import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { WeekDTO } from '../../shared/DTO/GET/WeekDTO';
import { BehaviorSubject, Subject, switchMap, takeUntil, timer } from 'rxjs';
import { ScheduleService } from '../../shared/services/http/schedule-service';
import { AsyncPipe, DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SaveWeekDTO } from '../../shared/DTO/POST/SaveWeekDTO ';
import { ActivatedRoute } from '@angular/router';
import { AlertService } from '../../utils/alert-service';
import { DemoSessionService } from '../../shared/services/http/demo-session-service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [AsyncPipe, DatePipe, ReactiveFormsModule, SlicePipe, UpperCasePipe],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit {
  // weekSchedule$!: Observable<WeekDTO>;

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
  private demoSessionService = inject(DemoSessionService);

  form = this.formBuilder.group({
    year: [0],
    weekNumber: [0],
    assignments: this.formBuilder.array<FormGroup>([]),
  });

  currentWeekStartDate = '';

  /**
   * 'edit' = form with input boxes
   * 'read' = plain text (HH:MM–HH:MM or OFF)
   */
  viewMode: 'edit' | 'read' = 'edit';

  timeRemaining$ = this.demoSessionService.timeRemainingSec$;
  isExpired = false;

  ngOnInit(): void {
    // 1) Start countdown timer (runs independently of route params)
    this.timeRemaining$.subscribe((sec) => {
      if (sec === 0 && !this.isExpired) {
        this.isExpired = true;
        setTimeout(() => window.location.reload(), 1500); // soft reload
      }
    });

    // 2) Load schedule when route params change
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const year = Number(params.get('year'));
          const week = Number(params.get('week'));
          return this.scheduleService.getWeek(year, week);
        }),
      )
      .subscribe((week) => {
        this.weekSubject.next(week);
        this.currentWeekStartDate = week.startDate;

        this.form.patchValue({
          year: week.year,
          weekNumber: week.weekNumber,
        });

        const assignments = this.assignmentsFormArray;
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
      });
  }

  get assignmentsFormArray(): FormArray {
    return this.form.get('assignments') as FormArray;
  }

  getShifts(employeeIndex: number): FormArray {
    return this.assignmentsFormArray.at(employeeIndex).get('shifts') as FormArray;
  }

  /**
   * True when week.status is not null (DRAFT, PUBLISHED, or LOCKED).
   * This controls whether the toggle is enabled.
   */
  get isWeekLocked(): boolean {
    const week = this.weekSubject.getValue();
    return week?.status != null;
  }

  /**
   * Toggle between 'edit' and 'read' modes.
   * Only allowed when isWeekLocked is true.
   */
  toggleViewMode(): void {
    if (!this.isWeekLocked) {
      return;
    }
    this.viewMode = this.viewMode === 'edit' ? 'read' : 'edit';
  }

  /**
   * Helpers for displaying shift text in read mode.
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

  formatShiftText(employeeIndex: number, dayIndex: number): string {
    const shift = this.getShiftForCell(employeeIndex, dayIndex);
    if (!shift) {
      return 'OFF';
    }
    return `${shift.startsAt} – ${shift.endsAt}`;
  }

  /**
   * Typing 0 → blur → 00
   * Typing 9 → blur → 09
   * Typing 25 in hour → input clamps it to 23
   * Typing 99 in hour → also clamped to 23
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

  getDateForDay(startDate: string, offset: number): Date {
    const [year, month, day] = startDate.split('-').map(Number);

    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + offset);

    return date;
  }

  formatDateForApi(startDate: string, offset: number): string {
    const date = this.getDateForDay(startDate, offset);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  private splitTime(time: string | null): { hour: string; minute: string } {
    if (!time) {
      return { hour: '', minute: '00' };
    }

    const [hour, minute] = time.split(':');

    return {
      hour: hour ?? '',
      minute: minute ?? '00',
    };
  }

  save(): void {
    this.blurAllTimeInputs();

    const raw = this.form.getRawValue();

    const payload: SaveWeekDTO = {
      year: raw.year ?? 0,
      weekNumber: raw.weekNumber ?? 0,
      weekStartDate: this.currentWeekStartDate,
      assignments: (raw.assignments ?? []).map((assignment: any) => {
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

    // console.log('Sending payload:', payload);

    this.scheduleService.saveWeek(payload).subscribe({
      next: () => console.log('Saved'),
      error: (err) => console.error(err),
    });
  }

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
   * EDGE CASE FUNCTION
   * The user might not "unfocus" one of the input box before saving,
   * so this function removes the focus and then clamp it to 00.
   */
  private blurAllTimeInputs(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[data-time-type]');
    inputs.forEach((input) => input.blur());
  }

  // ================
  // ACCORDION SET UP
  // ================

  /**
   * Which input is currently active:
   * - employeeIndex
   * - dayIndex
   * - fieldType: 'startHour' | 'startMinute' | 'endHour' | 'endMinute'
   */
  activeTimeInput: {
    employeeIndex: number;
    dayIndex: number;
    fieldType: 'startHour' | 'startMinute' | 'endHour' | 'endMinute';
  } | null = null;

  /**
   * Called on focus of hour/minute inputs.
   */
  openTimePicker(
    employeeIndex: number,
    dayIndex: number,
    fieldType: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
  ): void {
    this.activeTimeInput = { employeeIndex, dayIndex, fieldType };
  }

  /**
   * Called when user picks a value from the accordion.
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
   * Close accordion when clicking outside or pressing Escape (optional but nice).
   */
  closeTimePicker(): void {
    this.activeTimeInput = null;
  }
}

@Component({
  template: '',
})
export class RedirectComponent {}
