import { inject, Service } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder } from '@angular/forms';
import { WeekDTO } from '../DTO/GET/WeekDTO';
import { ShiftAssignmentDTO } from '../DTO/POST/ShiftAssignmentDTO ';
import { addDaysIso, splitTime } from '../utils/date-time-util';

export interface ShiftForm {
  actualDate: FormControl<string>;
  startHour: FormControl<string>;
  startMinute: FormControl<string>;
  endHour: FormControl<string>;
  endMinute: FormControl<string>;
}

export interface EmployeeScheduleForm {
  employeeId: FormControl<number>;
  employeeName: FormControl<string>;
  shifts: FormArray<FormGroup<ShiftForm>>;
}

export interface WeekScheduleForm {
  year: FormControl<number>;
  weekNumber: FormControl<number>;
  shiftAssignments: FormArray<FormGroup<EmployeeScheduleForm>>;
}

@Service()
export class ScheduleFormService {
  private fb = inject(NonNullableFormBuilder);

  createShiftForm(actualDate: string): FormGroup<ShiftForm> {
    return this.fb.group({
      actualDate: this.fb.control(actualDate),
      startHour: this.fb.control(''),
      startMinute: this.fb.control(''),
      endHour: this.fb.control(''),
      endMinute: this.fb.control(''),
    });
  }

  buildWeekForm(week: WeekDTO): FormGroup<WeekScheduleForm> {
    return this.fb.group({
      year: this.fb.control(week.year),
      weekNumber: this.fb.control(week.weekNumber),
      shiftAssignments: this.fb.array(
        week.employees.map((employee) => this.buildEmployeeGroup(week, employee)),
      ),
    });
  }

  private buildEmployeeGroup(
    week: WeekDTO,
    employee: WeekDTO['employees'][number],
  ): FormGroup<EmployeeScheduleForm> {
    const assignment = week.assignments.find((a) => a.employeeId === employee.employeeId);

    return this.fb.group({
      employeeId: this.fb.control(employee.employeeId),
      employeeName: this.fb.control(employee.firstName),
      shifts: this.fb.array(
        Array.from({ length: 7 }, (_, dayIndex) =>
          this.buildShiftGroup(week.startDate, dayIndex, assignment),
        ),
      ),
    });
  }

  private buildShiftGroup(
    startDate: string,
    dayIndex: number,
    assignment?: ShiftAssignmentDTO,
  ): FormGroup<ShiftForm> {
    const actualDate = addDaysIso(startDate, dayIndex);
    const saved = assignment?.shifts.find((s) => s.actualDate === actualDate);

    const start = splitTime(saved?.startsAt ?? null);
    const end = splitTime(saved?.endsAt ?? null);

    return this.fb.group({
      actualDate: this.fb.control(actualDate),
      startHour: this.fb.control(start.hour),
      startMinute: this.fb.control(start.minute),
      endHour: this.fb.control(end.hour),
      endMinute: this.fb.control(end.minute),
    });
  }
}
