import { APP_INITIALIZER } from "@angular/core";
import { RestaurantStore } from "./app/restaurant-store.service";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { AppComponent } from "./app/app.component";

registerLocaleData(localeEs);
bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [RestaurantStore],
      useFactory: (store: RestaurantStore) => () => store.initialize(),
    },
  ],
}).catch(console.error);
