import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  importProvidersFrom,
} from "@angular/core";
import { MonacoEditorModule } from "ngx-monaco-editor-v2";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(
      MonacoEditorModule.forRoot({
        baseUrl: "assets/monaco/vs",
      }),
    ),
  ],
};
