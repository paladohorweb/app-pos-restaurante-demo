import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEs);
bootstrapApplication(AppComponent, {providers: [provideAnimations()]}).catch(console.error);
