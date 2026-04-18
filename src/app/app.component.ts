
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  constructor(
    private translocoService: TranslocoService,
    private supabaseService: SupabaseService
  ) {
    // Initialize default language immediately
    this.setDefaultLanguage();
    // Then check for auth and user preferences
    this.supabaseService.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.loadUserLanguage();
      }
    });
  }

  ngOnInit() {
    this.loadUserLanguage();
  }

  private async loadUserLanguage() {
    const isAuth = await this.supabaseService.isAuthenticated();

    if (isAuth) {
      try {
        const profile = await this.supabaseService.getMyProfile();
        if (profile?.language_preference) {
          this.translocoService.setActiveLang(profile.language_preference);
        }
      } catch (error) {
        console.error('Failed to fetch language preference:', error);
      }
    }
  }

  private setDefaultLanguage() {
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const langCode = browserLang.split('-')[0].toLowerCase();
    const supportedLangs = ['en', 'da'];
    const lang = supportedLangs.includes(langCode) ? langCode : 'en';
    this.translocoService.setActiveLang(lang);
  }
}
