import { FormGroup } from '@angular/forms';
import { ShiftForm } from '../../services/schedule-form-service';

export interface CalendarShift {
  shiftId?: number;
  employeeId: number;
  employeeName: string;
  actualDate: string;
  form: FormGroup<ShiftForm>;
}