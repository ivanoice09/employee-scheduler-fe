import { AsyncPipe, DatePipe, UpperCasePipe } from '@angular/common';
import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
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
import { register } from 'swiper/element';
import { EmployeeModal } from '../../shared/components/employee-modal/employee-modal';
import { TimePicker } from '../../shared/components/time-picker/time-picker';
import { CalendarShift } from '../../shared/DTO/GET/CalendarShift';
import { EmployeeDTO } from '../../shared/DTO/GET/EmployeeDTO';
import { WeekDTO } from '../../shared/DTO/GET/WeekDTO';
import { DemoSessionHelper } from '../../shared/helpers/demo-session-helper';
import { SchedulePayloadMapper } from '../../shared/mappers/schedule-payload-mapper';
import { DayOffsetPipe } from '../../shared/pipes/day-offset-pipe';
import { DemoSessionTimerPipe } from '../../shared/pipes/demo-session-timer-pipe';
import { EmployeeService } from '../../shared/services/http/employee-service';
import { ScheduleService } from '../../shared/services/http/schedule-service';
import { ScheduleFormService, WeekScheduleForm } from '../../shared/services/schedule-form-service';
import { AlertUtil } from '../../shared/utils/alert-util';
import { ShiftDTO } from '../../shared/DTO/GET/ShiftDTO';

register();

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    UpperCasePipe,
    DemoSessionTimerPipe,
    DayOffsetPipe,
    EmployeeModal,
    TimePicker,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  private employeeService = inject(EmployeeService);

  viewMode = signal<'edit' | 'read'>('edit');
  reloading = signal(false);
  saving = signal(false);

  weekNavigationForm = this.formBuilder.group({
    weekNumber: [0, [Validators.required, Validators.min(1), Validators.max(53), integerValidator]],
  });

  yearNavigationForm = this.formBuilder.group({
    year: [0, [Validators.required, Validators.min(2026), Validators.max(2030), integerValidator]],
  });

  weekScheduleForm!: FormGroup<WeekScheduleForm>;

  currentWeekStartDate = '';

  dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  private readonly destroy$ = new Subject<void>();
  private demoSessionHelper = inject(DemoSessionHelper);
  remainingSeconds$ = this.demoSessionHelper.remainingSeconds$;

  ngOnInit(): void {
    this.employeeService
      .getEmployeesSaveInCache()
      .subscribe((employees) => this.employees.set(employees));

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

    this.yearNavigationForm.patchValue({
      year: week.year,
    });

    this.weekNavigationForm.patchValue({
      weekNumber: week.weekNumber,
    });

    this.weekScheduleForm = this.scheduleFormService.buildWeekForm(week);

    const employeesById = new Map(
      week.employees.map((employee) => [
        employee.employeeId,
        `${employee.firstName} ${employee.lastName}`.trim(),
      ]),
    );

    const calendarShifts = week.assignments.flatMap((assignment) => {
      const employeeName = 
        employeesById.get(assignment.employeeId) ?? 'Unknown employee';

      return assignment.shifts.map((shift) =>
        this.toCalendarShift(
          assignment.employeeId, 
          employeeName, 
          shift
        ),
      );
    });

    this.shifts.set(calendarShifts);
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

  changeYear(): void {
    const yearControl = this.yearNavigationForm.get('year');

    if (!yearControl || yearControl.invalid) {
      yearControl?.markAsTouched();
    }

    const week = this.week();

    if (!week) {
      return;
    }

    const newYear = Number(yearControl?.value);

    if (newYear === week.year) {
      return;
    }

    this.router.navigate(['/schedule', newYear, week.weekNumber])
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

  save(): void {
    const raw = this.weekScheduleForm.getRawValue();

    const payload = this.schedulePayloadMapper.toSaveWeekDtoFromCalendar(
      raw,
      this.currentWeekStartDate,
      this.shifts(),
    );

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

  get shiftAssignmentsFormArray(): FormArray {
    return this.weekScheduleForm.get('shiftAssignments') as FormArray;
  }

  // =====================
  // CONTROL BAR FUNCTIONS
  // =====================

  showOrHide: 'hide' | 'show' = 'show';

  toggleExpiryTimer() {
    this.showOrHide = this.showOrHide === 'show' ? 'hide' : 'show';
  }

  // ==========================================================
  //                MODERN UI SETTINGS HERE!!!
  // ==========================================================

  week = signal<WeekDTO | null>(null);
  shifts = signal<CalendarShift[]>([]);
  employees = signal<EmployeeDTO[]>([]);
  selectedDate = signal<string | null>(null);
  employeeModalOpen = signal(false);
  isExpiryHidden = signal(false);

  openEmployeeModal(date: string) {
    this.selectedDate.set(date);
    this.employeeModalOpen.set(true);
  }

  closeEmployeeModal() {
    this.employeeModalOpen.set(false);
    this.selectedDate.set(null);
  }

  addShift(employee: EmployeeDTO) {
    const date = this.selectedDate();

    if (!date || !employee) {
      return;
    }

    const shiftForm = this.scheduleFormService.createShiftForm(date);

    const newShift: CalendarShift = {
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      actualDate: date,
      form: shiftForm,
    };

    this.shifts.update((current) => [...current, newShift]);
    this.closeEmployeeModal();
  }

  getShiftsForDate(date: string): CalendarShift[] {
    return this.shifts().filter((shift) => shift.actualDate === date);
  }

  removeShift(shiftToRemove: CalendarShift): void {
    this.shifts.update((current) =>
      current.filter((shift) =>
        shiftToRemove.shiftId != null
          ? shift.shiftId !== shiftToRemove.shiftId
          : shift !== shiftToRemove,
      ),
    );
  }

  dayDate(index: number): string {
    const week = this.week();
    if (!week) return '';

    const date = new Date(week.startDate);
    date.setDate(date.getDate() + index);

    return date.toISOString().slice(0, 10);
  }

  selectedEmployeeIds = computed(() => {
    const date = this.selectedDate();

    if (!date) {
      return [];
    }

    return this.shifts()
      .filter((shift) => shift.actualDate === date)
      .map((shift) => shift.employeeId);
  });

  private toCalendarShift(
    employeeId: number,
    employeeName: string,
    shift: ShiftDTO,
  ): CalendarShift {
    const form = this.scheduleFormService.createShiftForm(shift.actualDate);

    const [startHour = '', startMinute = ''] = (shift.startsAt ?? '').split(':');
    const [endHour = '', endMinute = ''] = (shift.endsAt ?? '').split(':');

    form.patchValue({
      actualDate: shift.actualDate,
      startHour,
      startMinute,
      endHour,
      endMinute,
    });

    return {
      shiftId: shift.shiftId,
      employeeId,
      employeeName,
      actualDate: shift.actualDate,
      form,
    };
  }

  toggleExpiry() {
    this.isExpiryHidden.update(value => !value);
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
