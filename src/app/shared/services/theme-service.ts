import { Service } from '@angular/core';

export type Theme = 'light' | 'dark' | 'device';

const THEME_KEY = 'theme';

@Service()
export class ThemeService {
  private currentTheme: Theme = this.loadTheme();

  constructor() {
    this.applyTheme(this.currentTheme);

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.currentTheme === 'device') {
          this.applyTheme('device');
        }
      });
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this.applyTheme(theme);
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem(THEME_KEY);

    return stored === 'light' || stored === 'dark' || stored === 'device'
      ? stored
      : 'device';
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === 'device') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }
}
