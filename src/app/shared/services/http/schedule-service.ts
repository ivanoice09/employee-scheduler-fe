import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { WeekDTO } from '../../DTO/GET/WeekDTO';
import { SaveWeekDTO } from '../../DTO/POST/SaveWeekDTO ';
import { DemoSessionInfo } from '../../DTO/GET/DemoSessionInfo';

@Service()
export class ScheduleService {
  private baseUrl = 'http://localhost:8081/api/schedule';

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
