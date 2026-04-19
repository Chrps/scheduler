import { ChangeDetectionStrategy, Component, inject, NgZone, signal, viewChild, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import daLocale from '@fullcalendar/core/locales/da';
import { AppRole, RepeatUnit, ScheduleWithDetails, SupabaseService } from '../services/supabase.service';
import { ScheduleDialogComponent } from '../dialogs/schedule-dialog.component';
import { DeleteButtonComponent } from '../components/delete-button.component';

@Component({
  selector: 'app-main-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSelectModule,
    TranslocoModule,
    FullCalendarModule,
    DeleteButtonComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <main class="app-page app-page-top">
        <section class="app-shell">
          <nav class="app-page-selector">
            <a mat-stroked-button routerLink="/">{{ t('nav.schedule') }}</a>
            <a mat-stroked-button routerLink="/settings">{{ t('nav.settings') }}</a>
            @if (role() === 'admin') {
              <a mat-stroked-button routerLink="/admin">{{ t('nav.admin') }}</a>
            }
            <span class="app-nav-spacer"></span>
            <select class="app-lang-select" [value]="translocoService.getActiveLang()" (change)="switchLanguage($any($event.target).value)">
              <option value="en">🇬🇧</option>
              <option value="da">🇩🇰</option>
            </select>
            <button mat-stroked-button type="button" class="app-sign-out-btn" (click)="signOut()">
              <mat-icon>logout</mat-icon>
              {{ t('nav.logout') }}
            </button>
          </nav>

          <header class="app-hero">
            <span class="app-kicker">{{ t('schedule.title') }}</span>
            <h1>{{ t('schedule.heading') }}</h1>
            <p class="app-lead">{{ t('schedule.lead') }}</p>
          </header>

          <div class="app-schedule-actions">
            <button mat-flat-button color="primary" (click)="openAddDialog()">
              <mat-icon>add</mat-icon>
              {{ t('schedule.addSchedule') }}
            </button>
          </div>

          <mat-card class="app-card-wide">
            <mat-card-content>
              <full-calendar [options]="calendarOptions()" />
            </mat-card-content>
          </mat-card>

          @if (schedules().length > 0) {
            <mat-card class="app-card-wide app-stack">
              <mat-card-header>
                <mat-card-title>{{ t('schedule.title') }}</mat-card-title>
              </mat-card-header>
              <mat-card-content class="app-stack">
                <div class="app-list">
                  @for (s of schedules(); track s.id) {
                    <div class="app-list-item">
                      <div class="app-item-label">
                        <strong>{{ scheduleName(s) }}</strong>
                        <span class="app-hint">{{ repeatLabel(s) }} · {{ s.start_date }}</span>
                      </div>
                      <app-delete-btn (confirm)="removeSchedule(s.id)" />
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }


        </section>
      </main>
    </ng-container>
  `,
  styles: [`
    .app-schedule-actions {
      margin-bottom: 1rem;
    }

    :host ::ng-deep .fc .fc-button {
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.85);
      color: var(--mat-sys-on-surface, #1a1a1a);
      font-weight: 600;
      border-radius: 14px;
      text-transform: capitalize;
      box-shadow: none;
      transition: all 0.2s ease;
    }

    :host ::ng-deep .fc .fc-button:hover {
      background: rgba(92, 138, 255, 0.12);
      border-color: rgba(92, 138, 255, 0.3);
    }

    :host ::ng-deep .fc .fc-button-active,
    :host ::ng-deep .fc .fc-button:active {
      background: rgba(92, 138, 255, 0.18) !important;
      color: var(--mat-sys-primary, #5c8aff) !important;
      border-color: rgba(92, 138, 255, 0.4) !important;
      box-shadow: 0 10px 24px color-mix(in srgb, var(--mat-sys-primary, #5c8aff) 22%, transparent);
    }

    :host ::ng-deep .fc .fc-button:focus {
      box-shadow: 0 0 0 2px rgba(92, 138, 255, 0.25);
    }

    :host ::ng-deep .fc .fc-toolbar-title {
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    :host ::ng-deep .fc .fc-daygrid-event {
      border-radius: 8px;
      border: none;
      background: color-mix(in srgb, var(--mat-sys-primary, #5c8aff) 85%, black 5%);
      padding: 2px 6px;
      font-size: 0.85rem;
    }
  `],
})
export class MainPageComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  protected readonly translocoService = inject(TranslocoService);
  private readonly ngZone = inject(NgZone);
  private readonly dialog = inject(MatDialog);

  protected readonly role = signal<AppRole | null>(null);
  protected readonly schedules = signal<ScheduleWithDetails[]>([]);
  protected readonly calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locales: [daLocale],
    locale: this.translocoService.getActiveLang() === 'da' ? 'da' : 'en',
    headerToolbar: {
      left: 'prev,today,next',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    events: [],
    dateClick: (info) => this.openAddDialog(info.dateStr),
    height: 'auto',
  });

  constructor() {
    void this.loadProfile();
    void this.loadSchedules();

    // React to language changes — update calendar locale and re-render event titles
    this.translocoService.langChanges$.subscribe((lang) => {
      this.calendarOptions.update((opts) => ({
        ...opts,
        locale: lang === 'da' ? 'da' : 'en',
      }));
      void this.loadSchedules();
    });
  }

  protected openAddDialog(preselectedDate?: string) {
    const ref = this.dialog.open(ScheduleDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { preselectedDate },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        void this.loadSchedules();
      }
    });
  }

  protected async removeSchedule(id: string) {
    try {
      await this.supabaseService.removeSchedule(id);
      await this.loadSchedules();
    } catch (e) {
      console.error('Failed to remove schedule:', e);
    }
  }

  protected scheduleName(s: ScheduleWithDetails): string {
    const lang = this.translocoService.getActiveLang();
    const taskName = lang === 'da' ? s.tasks?.name_da : s.tasks?.name_en;
    const roomName = s.rooms ? (lang === 'da' ? s.rooms.name_da : s.rooms.name_en) : null;
    return roomName ? `${taskName} — ${roomName}` : (taskName ?? '');
  }

  protected repeatLabel(s: ScheduleWithDetails): string {
    const t = this.translocoService;
    const unitKey = `schedule.unitLabel.${s.repeat_unit}`;
    if (s.repeat_mode === 'per') {
      const perUnit = t.translate(unitKey + '.per');
      return s.repeat_every === 1
        ? `${t.translate('schedule.previewOnceA')} ${perUnit}`
        : `${s.repeat_every} ${t.translate('schedule.previewTimesA')} ${perUnit}`;
    }
    const unit = t.translate(unitKey + '.one');
    return s.repeat_every === 1
      ? `${t.translate('schedule.previewEvery')} ${unit}`
      : `${t.translate('schedule.previewEveryN')} ${s.repeat_every}. ${unit}`;
  }

  protected async signOut() {
    try {
      await this.supabaseService.signOut();
    } finally {
      this.ngZone.run(() => this.router.navigate(['/login']));
    }
  }

  protected switchLanguage(lang: string) {
    this.translocoService.setActiveLang(lang);
    this.supabaseService.setLanguagePreference(lang).catch((err) => {
      console.error('Failed to save language preference:', err);
    });
  }

  protected isLanguage(lang: string): boolean {
    return this.translocoService.getActiveLang() === lang;
  }

  private async loadProfile() {
    const profile = await this.supabaseService.getMyProfile();
    this.role.set(profile?.role ?? null);
  }

  private async loadSchedules() {
    const items = await this.supabaseService.listSchedules();
    this.schedules.set(items);

    // Convert schedules to FullCalendar events
    const events: EventInput[] = [];
    const today = new Date();
    const fallbackEnd = new Date(today);
    fallbackEnd.setMonth(fallbackEnd.getMonth() + 3); // generate events 3 months ahead if no end_date

    for (const s of items) {
      const start = new Date(s.start_date);
      const end = s.end_date ? new Date(s.end_date) : fallbackEnd;
      const lang = this.translocoService.getActiveLang();
      const taskName = lang === 'da' ? s.tasks?.name_da : s.tasks?.name_en;
      const roomName = s.rooms ? (lang === 'da' ? s.rooms.name_da : s.rooms.name_en) : null;
      const title = roomName ? `${taskName} — ${roomName}` : (taskName ?? 'Task');

      const increment = (d: Date) => {
        const next = new Date(d);
        if (s.repeat_mode === 'per') {
          // "N times per unit" → divide the unit into N equal steps
          const unitDays: Record<string, number> = { day: 1, week: 7, month: 30, quarter: 91, year: 365 };
          const stepDays = Math.max(1, Math.round((unitDays[s.repeat_unit] ?? 7) / s.repeat_every));
          next.setDate(next.getDate() + stepDays);
        } else {
          // "every N units"
          switch (s.repeat_unit) {
            case 'day': next.setDate(next.getDate() + s.repeat_every); break;
            case 'week': next.setDate(next.getDate() + 7 * s.repeat_every); break;
            case 'month': next.setMonth(next.getMonth() + s.repeat_every); break;
            case 'quarter': next.setMonth(next.getMonth() + 3 * s.repeat_every); break;
            case 'year': next.setFullYear(next.getFullYear() + s.repeat_every); break;
          }
        }
        return next;
      };

      let current = new Date(start);
      // Fast-forward past dates to near today
      while (current < today) {
        current = increment(current);
      }
      // Generate events up to schedule end date
      while (current <= end) {
        events.push({
          title,
          start: current.toISOString().slice(0, 10),
          allDay: true,
          extendedProps: { scheduleId: s.id },
        });
        current = increment(current);
      }
    }

    this.calendarOptions.update((opts) => ({ ...opts, events }));
  }
}
