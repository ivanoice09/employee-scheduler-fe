import { Component, inject } from '@angular/core';
import { AlertUtil } from '../../services/utils/alert-util';

@Component({
  selector: 'app-alert-outlet',
  imports: [],
  templateUrl: './alert-outlet.html',
  styleUrl: './alert-outlet.css',
})
export class AlertOutlet {
  readonly alertService = inject(AlertUtil);

  hide(id: string) {
    this.alertService.hide(id);
  }
}
