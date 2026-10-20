import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { EmployeeService } from '../../services/http/employee-service';
import { EmployeeDTO } from '../../DTO/GET/EmployeeDTO';

@Component({
  selector: 'app-employee-modal',
  imports: [],
  templateUrl: './employee-modal.html',
  styleUrl: './employee-modal.css',
})
export class EmployeeModal implements OnInit {
  employees = signal<EmployeeDTO[]>([]);
  loading = signal(false);

  modalOpen = input.required<boolean>();
  employeeSelected = output<EmployeeDTO>();
  modalClosed = output<void>();

  private employeeService = inject(EmployeeService);

  ngOnInit() {
    this.loading.set(true);

    this.employeeService.getEmployeesSaveInCache().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectEmployee(employee: EmployeeDTO): void {
    this.employeeSelected.emit(employee);
  }

  close(): void {
    this.modalClosed.emit();
  }
}
