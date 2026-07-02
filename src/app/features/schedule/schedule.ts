import { Component } from '@angular/core';

@Component({
  selector: 'app-schedule',
  imports: [],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
  employees: string[] = [
    'Luca Rossi',
    'Giulia Bianchi',
    'Marco Ferrari',
    'Sara Romano',
    'Alessandro Conti',
    'Chiara Ricci',
    'Matteo Greco',
    'Elena Bruno',
    'Davide Gallo',
    'Francesca Moretti',
  ];
}
