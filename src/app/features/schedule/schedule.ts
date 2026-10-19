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
import { filter, finalize, Subject, switchMap, takeUntil } from 'rxjs';
import { ScheduleRow } from '../../shared/components/schedule-row/schedule-row';
import { WeekDTO } from '../../shared/DTO/GET/WeekDTO';
import { DemoSessionHelper } from '../../shared/helpers/demo-session-helper';
import { SchedulePayloadMapper } from '../../shared/mappers/schedule-payload-mapper';
import { DayOffsetPipe } from '../../shared/pipes/day-offset-pipe';
import { DemoSessionTimerPipe } from '../../shared/pipes/demo-session-timer-pipe';
import { ScheduleService } from '../../shared/services/http/schedule-service';
import { ScheduleFormService, WeekScheduleForm } from '../../shared/services/schedule-form-service';
import { AlertUtil } from '../../shared/utils/alert-util';
import { toTime } from '../../shared/utils/date-time-util';

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
    DayOffsetPipe,
    ScheduleRow,
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit, OnDestroy {
  private formBuilder = inject(FormBuilder);
  private scheduleService = inject(ScheduleService);
  private route = inject(ActivatedRoute);
  private alertUtil = inject(AlertUtil);
  private router = inject(Router);
  private scheduleFormService = inject(ScheduleFormService);
  private schedulePayloadMapper = inject(SchedulePayloadMapper);

  week = signal<WeekDTO | null>(null);
  viewMode = signal<'edit' | 'read'>('edit');
  reloading = signal(false);
  saving = signal(false);

  weekNavigationForm = this.formBuilder.group({
    weekNumber: [0, [Validators.required, Validators.min(1), Validators.max(53), integerValidator]],
  });

  weekScheduleForm!: FormGroup<WeekScheduleForm>;

  currentWeekStartDate = '';

  dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    this.week.set(week);
    this.currentWeekStartDate = week.startDate;

    this.weekNavigationForm.patchValue({
      weekNumber: week.weekNumber,
    });

    this.weekScheduleForm = this.scheduleFormService.buildWeekForm(week);
  }

  private reloadCurrentWeek(): void {
    const week = this.week();

    if (!week || this.reloading()) {
      return;
    }

    this.reloading.set(true);

    this.scheduleService
      .getWeek(week.year, week.weekNumber)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.reloading.set(false)),
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

  changeWeek(): void {
    const weekControl = this.weekNavigationForm.get('weekNumber');

    if (!weekControl || weekControl.invalid) {
      weekControl?.markAsTouched();
      return;
    }

    const week = this.week();

    if (!week) {
      return;
    }

    const newWeekNumber = Number(weekControl.value);

    if (newWeekNumber === week.weekNumber) {
      return;
    }

    this.router.navigate(['/schedule', week.year, newWeekNumber]);
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
  isWeekLocked = computed(() => this.week()?.status != null);

  /**
   * Toggle between 'edit' and 'read' modes.
   * Only allowed when get isWeekLocked() is TRUE.
   */
  toggleViewMode(): void {
    if (!this.isWeekLocked()) {
      return;
    }

    this.viewMode.set(this.viewMode() === 'edit' ? 'read' : 'edit');
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

    const startsAt = toTime(startHour, startMinute);
    const endsAt = toTime(endHour, endMinute);

    if (!startsAt || !endsAt) {
      return null;
    }

    return { startsAt, endsAt };
  }

  save(): void {
    const raw = this.weekScheduleForm.getRawValue();

    const payload = this.schedulePayloadMapper.toSaveWeekDto(raw, this.currentWeekStartDate);

    this.saving.set(true);

    this.scheduleService
      .saveWeek(payload)
      .pipe(
        // delay(600), // just to show if spinner animation works
        takeUntil(this.destroy$),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.alertUtil.show('Save successful', 'success');
          this.reloadCurrentWeek();
        },
        error: (err) => console.error(err),
      });
  }

  // ==========
  // TimePicker
  // ==========

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
