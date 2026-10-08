import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { DemoSessionHelper } from '../shared/services/helpers/demo-session-helper';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

export const demoSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const demoSessionHelper = inject(DemoSessionHelper);

  return next(req).pipe(
    tap((event: HttpEvent<unknown>) => {
      if (!(event instanceof HttpResponse)) {
        return;
      }

      const expiresAtHeader = event.headers.get(
        'X-Demo-Session-Expires-At',
      );

      if (!expiresAtHeader) {
        return;
      }

      const expiresAtMillis = Number(expiresAtHeader);

      if (Number.isFinite(expiresAtMillis)) {
        demoSessionHelper.start(expiresAtMillis);
      }
    }),
  );
};