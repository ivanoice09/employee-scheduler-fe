import { Component, inject } from '@angular/core';
import { AlertService } from '../../../utils/alert-service';

@Component({
  selector: 'app-alert-outlet',
  imports: [],
  templateUrl: './alert-outlet.html',
  styleUrl: './alert-outlet.css',
})
export class AlertOutlet {
  readonly alertService = inject(AlertService);

  hide(id: string) {
    this.alertService.hide(id);
  }
}
