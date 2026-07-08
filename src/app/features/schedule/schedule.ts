import { Component, inject, OnInit } from '@angular/core';
import { WeekScheduleDTO } from '../../shared/DTO/GET/WeekScheduleDTO';
import { Observable } from 'rxjs';
import { ScheduleService } from '../../shared/services/http/schedule-service';
import { AsyncPipe, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SaveWeekScheduleDTO } from '../../shared/DTO/POST/SaveWeekScheduleDTO ';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [AsyncPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit {
  weekSchedule$!: Observable<WeekScheduleDTO>;

  dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  hours = Array.from(
    // makes a new array with 24 items
    { length: 24 },
    // this is a callback run for each item, where i is the index from 0 to 23. 
    // The underscore is just a placeholder to ignore the first argument.
    (_, i) => 
    //  turns the number into a 2-digit string, so 0 becomes "00" and 9 becomes "09"
    i.toString().padStart(2, '0')
  );

  minutes = ['00', '15', '30', '45'];

  private fb = inject(FormBuilder);
  private scheduleService = inject(ScheduleService);

  form = this.fb.group({
    year: [0],
    weekNumber: [0],
    assignments: this.fb.array<FormGroup>([]),
  });

  currentWeekStartDate = '';

  ngOnInit() {
    this.weekSchedule$ = this.scheduleService.getWeek(2026, 28);

    this.weekSchedule$.subscribe((week: WeekScheduleDTO) => {
      this.currentWeekStartDate = week.startDate;

      this.form.patchValue({
        year: week.year,
        weekNumber: week.weekNumber,
      });

      const assignments = this.assignmentsFormArray;
      assignments.clear();

      const assignmentByEmployeeId = new Map(
        week.assignments.map(a => [a.employeeId, a])
      );

      for (const employee of week.employees) {
        const employeeAssignment = assignmentByEmployeeId.get(employee.employeeId);

        assignments.push(
          this.fb.group({
            employeeId: [employee.employeeId],
            employeeName: [`${employee.firstName} ${employee.lastName}`],
            shifts: this.fb.array(
              Array.from({ length: 7 }, (_, dayIndex) => {
                const actualDate = this.formatDateForApi(week.startDate, dayIndex);

                const savedShift = employeeAssignment?.shifts.find(
                  s => s.actualDate === actualDate
                );

                const start = this.splitTime(savedShift?.startsAt ?? null);
                const end = this.splitTime(savedShift?.endsAt ?? null);

                return this.fb.group({
                  actualDate: [actualDate],
                  startHour: [start.hour],
                  startMinute: [start.minute],
                  endHour: [end.hour],
                  endMinute: [end.minute],
                });
              })
            ),
          })
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

  getDateForDay(
    startDate: string, // expects a date string argument in "YYYY-MM-DD" format
    offset: number // how many days to move forward or backward
  ): Date // returns a Date object 
  {

    // Split the date string
    const [year, month, day] // 3) the mapped numbers are assigned to year, month, and day by array destructuring
      = startDate.split('-') // 1) turns "2026-07-08" into ["2026", "07", "08"]
      .map(Number); // 2) converts those strings into numbers: [2026, 7, 8]

    // Create a Date object
    const date = new Date(
      year, 
      month - 1, // new Date(year, monthIndex, day) uses a zero-based month index, so January is 0 and December is 11, that is why month - 1
      day
    );

    date.setDate( // 3) updates the Date object
      date.getDate() //  1) gets the current day number
      + offset // 2) adds the number of days you want to move
    );

    return date;
  }

  formatDateForApi(startDate: string, offset: number): string {
    const date = this.getDateForDay(startDate, offset);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  private toTime(hour: string, minute: string): string | null {
    if (!hour || !minute) {
      return null;
    }

    return `${hour}:${minute}`;
  }

  private splitTime(time: string | null): { hour: string; minute: string } {
    if (!time) {
      return { hour: '', minute: '' };
    }

    const [hour, minute] = time.split(':');
    return {
      hour: hour ?? '',
      minute: minute ?? '',
    };
  }

  save(): void {
    const raw = this.form.getRawValue();

    const payload: SaveWeekScheduleDTO = {
      year: raw.year ?? 0,
      weekNumber: raw.weekNumber ?? 0,
      weekStartDate: this.currentWeekStartDate,
      assignments: (raw.assignments ?? []).map((assignment: any) => ({
        employeeId: assignment.employeeId,
        shifts: (assignment.shifts ?? []).map((shift: any) => ({
          actualDate: shift.actualDate,
          startsAt: this.toTime(shift.startHour, shift.startMinute),
          endsAt: this.toTime(shift.endHour, shift.endMinute),
        })),
      })),
    };

    this.scheduleService.saveWeek(payload).subscribe({
      next: () => console.log('Saved'),
      error: (err) => console.error(err),
    });
  }
}
