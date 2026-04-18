import { ChangeDetectionStrategy, Component, computed, inject, NgZone, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-auth-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    TranslocoModule,
  ],
  template: `
    <ng-container *transloco="let t">
      <main class="app-page">
        <section class="app-shell">
          <header class="app-hero">
            <span class="app-kicker">{{ t('app.title') }}</span>
            <h1>Secure access for your team.</h1>
            <p class="app-lead">
              Sign in to manage members, invites, and roles through a simple admin workflow.
            </p>
          </header>

          <mat-card class="app-card">
            <mat-card-header>
              <mat-card-title>Welcome back</mat-card-title>
              <mat-card-subtitle>Sign in with your account or finish an invited signup.</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content class="app-stack">
              <p class="app-hint">{{ t('auth.inviteOnly') }}</p>

              <mat-tab-group
                [selectedIndex]="mode() === 'login' ? 0 : 1"
                (selectedIndexChange)="setMode($event === 0 ? 'login' : 'signup')"
              >
                <mat-tab [label]="t('auth.loginTab')">
                  <form [formGroup]="loginForm" (ngSubmit)="login()" class="app-form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>{{ t('auth.email') }}</mat-label>
                      <input matInput type="email" formControlName="email" />
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>{{ t('auth.password') }}</mat-label>
                      <input matInput type="password" formControlName="password" />
                    </mat-form-field>

                    <button mat-flat-button color="primary" type="submit" [disabled]="busy() || loginForm.invalid">
                      <mat-icon>login</mat-icon>
                      {{ t('auth.login') }}
                    </button>
                  </form>
                </mat-tab>

                <mat-tab [label]="t('auth.signupTab')">
                  <form [formGroup]="signupForm" (ngSubmit)="signup()" class="app-form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>{{ t('auth.email') }}</mat-label>
                      <input matInput type="email" formControlName="email" />
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>{{ t('auth.password') }}</mat-label>
                      <input matInput type="password" formControlName="password" />
                      <mat-hint>Password must be at least 6 characters.</mat-hint>
                    </mat-form-field>

                    <button mat-flat-button color="primary" type="submit" [disabled]="busy() || signupForm.invalid">
                      <mat-icon>person_add</mat-icon>
                      {{ t('auth.signup') }}
                    </button>
                  </form>
                </mat-tab>
              </mat-tab-group>

              @if (message()) {
                <p class="app-msg">{{ message() }}</p>
              }

              @if (error()) {
                <p class="app-error">{{ error() }}</p>
              }
            </mat-card-content>

            <mat-card-actions align="end">
              @if (showAdminLink()) {
                <a mat-button routerLink="/admin">{{ t('settings.admin') }}</a>
              }
            </mat-card-actions>
          </mat-card>

          <div class="app-lang-switcher">
            <select class="app-lang-select" [value]="translocoService.getActiveLang()" (change)="switchLanguage($any($event.target).value)">
              <option value="en">🇬🇧</option>
              <option value="da">🇩🇰</option>
            </select>
          </div>
        </section>
      </main>
    </ng-container>
  `,
})
export class AuthPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  protected readonly translocoService = inject(TranslocoService);
  private readonly ngZone = inject(NgZone);

  protected readonly mode = signal<'login' | 'signup'>('login');
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly currentRole = signal<'user' | 'admin' | null>(null);
  protected readonly showAdminLink = computed(() => this.currentRole() === 'admin');

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly signupForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected setMode(nextMode: 'login' | 'signup') {
    this.mode.set(nextMode);
    this.message.set('');
    this.error.set('');
  }

  protected switchLanguage(lang: string) {
    this.translocoService.setActiveLang(lang);
    if (this.supabaseService) {
      this.supabaseService.setLanguagePreference(lang).catch((err) => {
        console.error('Failed to save language preference:', err);
      });
    }
  }

  protected isLanguage(lang: string): boolean {
    return this.translocoService.getActiveLang() === lang;
  }

  protected async login() {
    this.error.set('');
    this.message.set('');

    if (this.loginForm.invalid) {
      return;
    }

    this.busy.set(true);
    try {
      const { email, password } = this.loginForm.getRawValue();
      const result = await this.supabaseService.signIn(email, password);

      if (result.error) {
        throw result.error;
      }

      await this.routeForRole();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Login failed');
    } finally {
      this.busy.set(false);
    }
  }

  protected async signup() {
    this.error.set('');
    this.message.set('');

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.error.set('Please enter a valid email and a password with at least 6 characters.');
      return;
    }

    this.busy.set(true);
    try {
      const { email, password } = this.signupForm.getRawValue();
      const result = await this.supabaseService.signUp(email, password);

      if (result.error) {
        throw result.error;
      }

      if (result.data.session) {
        await this.routeForRole();
        return;
      }

      this.message.set('Account created. You can now log in. If this fails, ask admin to invite/allowlist your email.');
      this.mode.set('login');
      this.loginForm.patchValue({ email, password: '' });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === 'signup_disabled'
      ) {
        this.error.set(
          'Signups are disabled on the current Supabase project. Use local Supabase, or enable Email signup in Auth settings.',
        );
        return;
      }

      const fallback = 'Sign up failed. Make sure your email has been invited by an admin.';
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        this.error.set(typeof message === 'string' && message.length > 0 ? message : fallback);
      } else {
        this.error.set(fallback);
      }
    } finally {
      this.busy.set(false);
    }
  }

  private async routeForRole() {
    const profile = await this.supabaseService.getMyProfile();
    this.currentRole.set(profile?.role ?? null);

    if (profile?.role === 'admin') {
      this.ngZone.run(() => this.router.navigate(['/admin']));
      return;
    }

    this.ngZone.run(() => this.router.navigate(['/settings']));
  }
}
