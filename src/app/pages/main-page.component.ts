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
import { AppRole, ScheduleInterval, ScheduleWithDetails, SupabaseService } from '../services/supabase.service';
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
                        <span class="app-hint">{{ intervalLabel(s.interval) }} · {{ s.start_date }}</span>
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
  }

  protected openAddDialog(preselectedDate?: string) {
    const ref = this.dialog.open(ScheduleDialogComponent, {
      width: '420px',
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

  protected intervalLabel(interval: ScheduleInterval): string {
    const key = `schedule.interval${interval.charAt(0).toUpperCase() + interval.slice(1)}`;
    return this.translocoService.translate(key);
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
    const end = new Date(today);
    end.setMonth(end.getMonth() + 3); // generate events 3 months ahead

    for (const s of items) {
      const start = new Date(s.start_date);
      const lang = this.translocoService.getActiveLang();
      const taskName = lang === 'da' ? s.tasks?.name_da : s.tasks?.name_en;
      const roomName = s.rooms ? (lang === 'da' ? s.rooms.name_da : s.rooms.name_en) : null;
      const title = roomName ? `${taskName} — ${roomName}` : (taskName ?? 'Task');

      const increment = (d: Date) => {
        const next = new Date(d);
        switch (s.interval) {
          case 'daily': next.setDate(next.getDate() + 1); break;
          case 'weekly': next.setDate(next.getDate() + 7); break;
          case 'biweekly': next.setDate(next.getDate() + 14); break;
          case 'monthly': next.setMonth(next.getMonth() + 1); break;
        }
        return next;
      };

      let current = start < today ? new Date(start) : start;
      // Fast-forward past dates to near today
      while (current < today) {
        current = increment(current);
      }
      // Generate events up to end date
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
