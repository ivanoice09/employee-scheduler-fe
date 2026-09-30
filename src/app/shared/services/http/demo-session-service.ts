import { Service } from '@angular/core';
import { BehaviorSubject, interval, map, of, shareReplay, switchMap } from 'rxjs';

@Service()
export class DemoSessionService {
  private readonly expiryMs$ = new BehaviorSubject<number | null>(null);

  readonly timeRemainingSec$ = this.expiryMs$.pipe(
    switchMap((exp) =>
      exp === null
        ? of(null)
        : interval(1000).pipe(map(() => Math.max(0, Math.floor((exp - Date.now()) / 1000)))),
    ),
    shareReplay(1),
  );

  setExpiry(epochMs: number) {
    this.expiryMs$.next(epochMs);
  }

  isExpired(): boolean {
    const exp = this.expiryMs$.getValue();
    return exp !== null && Date.now() >= exp;
  }
}
