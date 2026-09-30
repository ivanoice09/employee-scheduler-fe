import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { DemoSessionService } from '../shared/services/http/demo-session-service';
import { catchError, tap, throwError } from 'rxjs';

export const interceptor: HttpInterceptorFn = (req, next) => {
  const demoSessionService = inject(DemoSessionService);

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const expiryHeader = event.headers.get('X-Demo-Session-Expiry');
        if (expiryHeader) {
          demoSessionService.setExpiry(+expiryHeader);
        }
      }
    }),
  );
};
