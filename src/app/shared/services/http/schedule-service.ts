import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { WeekDTO } from '../../DTO/GET/WeekDTO';
import { SaveWeekDTO } from '../../DTO/POST/SaveWeekDTO ';
import { environment } from '../../../../environments/environment';

@Service()
export class ScheduleService {
  private baseUrl = `${environment.apiUrl}/schedule`;

  private http = inject(HttpClient);

  getWeek(year: number, weekNumber: number): Observable<WeekDTO> {
    return this.http.get<WeekDTO>(
      `${this.baseUrl}/${year}/${weekNumber}`, 
      { withCredentials: true }
    );
  }

  saveWeek(payload: SaveWeekDTO): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/save`, 
      payload,
      { withCredentials: true }
    );
  }

}
