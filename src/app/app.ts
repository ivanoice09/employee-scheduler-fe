import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertOutlet } from './shared/components/alert-outlet/alert-outlet';
import { Navbar } from './core/layout/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AlertOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('employee-scheduler-fe');
}
