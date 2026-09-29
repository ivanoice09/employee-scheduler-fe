import { Service, signal } from '@angular/core';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface UiAlert {
  id: string;
  message: string;
  type: AlertType;
  duration: number;
  visible: boolean;
}

@Service()
export class AlertService {
  readonly alerts = signal<UiAlert[]>([]);

  show(message: string, type: UiAlert['type'], duration = 3500) {
    const id = crypto.randomUUID();

    this.alerts.update((curr) => [{ id, message, type, duration, visible: true }, ...curr]);

    window.setTimeout(() => this.hide(id), duration);
  }

    hide(id: string) {
    this.alerts.update(curr => 
      curr.map(a => 
        (a.id === id ? { ...a, visible: false } : a)
      )
    );

    window.setTimeout(() => {
      this.alerts.update(curr => curr.filter((a) => a.id !== id));
    }, 320);
  }
}
