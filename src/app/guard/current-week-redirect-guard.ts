import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WeekUtil } from '../shared/services/utils/week-util';

export const currentWeekRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const weekUtil = inject(WeekUtil);

  const year = weekUtil.getCurrentYear();
  const week = weekUtil.getCurrentWeek();

  return router.createUrlTree(['/schedule', year, week]);
};
