import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WeekUtil } from '../shared/utils/week-util';

export const scheduleRouteGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const weekUtil = inject(WeekUtil);

  const rawYear = route.paramMap.get('year');
  const rawWeek = route.paramMap.get('week');

  const year = Number(rawYear);
  const week = Number(rawWeek);

  const currentYear = weekUtil.getCurrentYear();
  const currentWeek = weekUtil.getCurrentWeek();

  if (!Number.isInteger(year) || year < 2000 || year > currentYear + 1) {
    return router.createUrlTree(['/schedule', currentYear, currentWeek]);
  }

  if (!Number.isInteger(week) || week < 1 || week > 53) {
    return router.createUrlTree(['/schedule', currentYear, currentWeek]);
  }

  return true;
};
