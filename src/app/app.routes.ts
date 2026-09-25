import { Routes } from '@angular/router';
import { RedirectComponent, Schedule } from './features/schedule/schedule';
import { currentWeekRedirectGuard } from './guard/current-week-redirect-guard';

export const routes: Routes = [
    { 
        path: '', 
        component: RedirectComponent,
        canActivate: [currentWeekRedirectGuard],
        pathMatch: 'full',
    },
    {
        path: 'schedule/:year/:week',
        component: Schedule,
    }
];
