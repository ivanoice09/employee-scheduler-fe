import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { WeekScheduleDTO } from '../../DTO/GET/WeekScheduleDTO';
import { SaveWeekScheduleDTO } from '../../DTO/POST/SaveWeekScheduleDTO ';

@Service()
export class ScheduleService {

    private baseUrl = 'http://localhost:8081/api/schedule'

    private http = inject(HttpClient);

    getWeek(year: number, weekNumber: number): Observable<WeekScheduleDTO> {
        return this.http.get<WeekScheduleDTO>(`${this.baseUrl}/${year}/${weekNumber}`);
    }

    saveWeek(payload: SaveWeekScheduleDTO): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/save`, payload);
    }
}
