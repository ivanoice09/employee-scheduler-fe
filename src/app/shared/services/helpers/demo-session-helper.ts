import { Service } from '@angular/core';
import {
    BehaviorSubject,
    interval,
    Subscription
} from 'rxjs';

@Service()
export class DemoSessionHelper {
  private readonly remainingSecondsSubject = new BehaviorSubject<number | null>(null);

  readonly remainingSeconds$ = this.remainingSecondsSubject.asObservable();

  private timerSubscription?: Subscription;

  start(expiresAtMillis: number): void {
    this.timerSubscription?.unsubscribe();

    const update = () => {
      const remainingSeconds = Math.max(
        0, 
        Math.ceil((expiresAtMillis - Date.now()) / 1000)
      );

      this.remainingSecondsSubject.next(remainingSeconds);

      if (remainingSeconds === 0) {
        this.timerSubscription?.unsubscribe();
      }
    };

    update();
    this.timerSubscription = interval(1000).subscribe(update);
  }

  clear(): void {
    this.timerSubscription?.unsubscribe();
    this.remainingSecondsSubject.next(null);
  }
}
