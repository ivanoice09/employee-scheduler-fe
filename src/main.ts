import { bootstrapApplication, Title } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    const title = appRef.injector.get(Title);

    title.setTitle(
      `${environment.production ? 'PROD': 'LOCAL'} Employee Scheduler`
    );
  })
  .catch((err) => console.error(err));
