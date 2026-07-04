import { Component } from '@angular/core';
import { WeekScheduleDTO } from '../../shared/services/http/DTO/WeekScheduleDTO';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-schedule',
  imports: [],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {

  private weekScheduleSubject = new BehaviorSubject<WeekScheduleDTO | null>(null);
  weekSchedule$ = this.weekScheduleSubject.asObservable();

  

  // employees: string[] = [
  //   'Luca Rossi',
  //   'Giulia Bianchi',
  //   'Marco Ferrari',
  //   'Sara Romano',
  //   'Alessandro Conti',
  //   'Chiara Ricci',
  //   'Matteo Greco',
  //   'Elena Bruno',
  //   'Davide Gallo',
  //   'Francesca Moretti',
  // ];
}

