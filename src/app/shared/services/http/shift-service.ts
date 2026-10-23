import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Service()
export class ShiftService {
  private baseUrl = `${environment.apiUrl}/shift`;

  private http = inject(HttpClient);

  deleteShift(shiftId: number) {
    return this.http.delete<void>(
        `${this.baseUrl}/${shiftId}`,
        { withCredentials: true },
    );
  }
}
