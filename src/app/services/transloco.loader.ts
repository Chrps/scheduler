import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<Translation> {
    // Support GitHub Pages base href by checking for it
    const basePath = this.getBasePath();
    return this.http.get<Translation>(`${basePath}/assets/i18n/${lang}.json`);
  }

  private getBasePath(): string {
    // If running on GitHub Pages with a subdirectory, adjust path accordingly
    const baseHref = document.querySelector('base')?.href || '/';
    // Remove trailing slash for consistent path construction
    return baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
  }
}
