import { Service } from '@angular/core';

@Service()
export class WeekUtil {

    getCurrentYear(): number {
        return new Date().getFullYear();
    }

    getCurrentWeek(): number {
        const date = new Date();
        const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }
}
