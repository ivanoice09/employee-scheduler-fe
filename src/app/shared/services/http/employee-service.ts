import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmployeeDTO } from '../../DTO/GET/EmployeeDTO';

@Service()
export class EmployeeService {
  private baseUrl = `${environment.apiUrl}/employees`;

  private http = inject(HttpClient);

  private employees$?: Observable<EmployeeDTO[]>;

  getEmployeesSaveInCache(): Observable<EmployeeDTO[]> {
    if (!this.employees$) {
      this.employees$ = this.http.get<EmployeeDTO[]>(this.baseUrl, { withCredentials: true }).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError((error) => {
          this.employees$ = undefined;
          return throwError(() => error);
        }),
      );
    }

    return this.employees$;
  }

  getEmployees(): Observable<EmployeeDTO[]> {
    return this.http.get<EmployeeDTO[]>(this.baseUrl);
  }
}
