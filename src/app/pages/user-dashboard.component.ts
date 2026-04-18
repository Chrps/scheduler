import { ChangeDetectionStrategy, Component, inject, NgZone, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppRole, Room, SupabaseService, Task } from '../services/supabase.service';
import { BilingualNameDialogComponent, BilingualNameDialogResult } from '../dialogs/bilingual-name-dialog.component';
import { DeleteButtonComponent } from '../components/delete-button.component';

@Component({
  selector: 'app-user-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatSelectModule,
    TranslocoModule,
    DeleteButtonComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <main class="app-page">
        <section class="app-shell">
          <nav class="app-page-selector">
            <a mat-stroked-button routerLink="/">{{ t('nav.schedule') }}</a>
            <a mat-stroked-button routerLink="/settings">{{ t('nav.settings') }}</a>
            @if (profileRole() === 'admin') {
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
            <span class="app-kicker">{{ t('nav.settings') }}</span>
            <h1>{{ t('settings.welcomeTitle') }}</h1>
            <p class="app-lead">Manage your account, tasks, and rooms.</p>
          </header>

          <mat-card class="app-card-wide">
            <mat-card-header>
              <mat-card-title>{{ t('settings.welcomeTitle') }}</mat-card-title>
              <mat-card-subtitle>Your account details</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content class="app-data-points">
              @if (profileEmail()) {
                <div class="app-data-pill">
                  <span class="app-data-label">{{ t('settings.email') }}</span>
                  <strong>{{ profileEmail() }}</strong>
                </div>
              }

              @if (profileRole()) {
                <div class="app-data-pill">
                  <span class="app-data-label">{{ t('settings.role') }}</span>
                  <strong>{{ profileRole() }}</strong>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Tasks Section -->
          <mat-card class="app-card-wide app-stack">
            <mat-card-header>
              <mat-card-title>{{ t('settings.tasksSection') }}</mat-card-title>
              <mat-card-subtitle>{{ t('settings.tasksSubtitle') }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content class="app-stack">
              <button mat-flat-button color="primary" class="app-add-btn" (click)="openAddTask()">
                <mat-icon>add_circle</mat-icon>
                {{ t('settings.addTask') }}
              </button>

              @if (taskMessage()) {
                <p class="app-msg">{{ taskMessage() }}</p>
              }

              @if (taskError()) {
                <p class="app-error">{{ taskError() }}</p>
              }

              @if (tasks().length === 0) {
                <p class="app-hint">{{ t('settings.noTasks') }}</p>
              } @else {
                <div class="app-list">
                  @for (task of tasks(); track task.id) {
                    <div class="app-list-item">
                      <div class="app-item-label">
                        <mat-chip-set>
                          <mat-chip>{{ task.is_default ? t('settings.defaultTaskBadge') : t('settings.myTaskBadge') }}</mat-chip>
                        </mat-chip-set>
                        <strong>{{ taskDisplayName(task) }}</strong>
                      </div>
                      @if (!task.is_default) {
                        <app-delete-btn [disabled]="busyTasks()" (confirm)="removeTask(task.id)" />
                      }
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Rooms Section -->
          <mat-card class="app-card-wide app-stack">
            <mat-card-header>
              <mat-card-title>{{ t('settings.roomsSection') }}</mat-card-title>
              <mat-card-subtitle>{{ t('settings.roomsSubtitle') }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content class="app-stack">
              <button mat-flat-button color="primary" class="app-add-btn" (click)="openAddRoom()">
                <mat-icon>add_circle</mat-icon>
                {{ t('settings.addRoom') }}
              </button>

              @if (roomMessage()) {
                <p class="app-msg">{{ roomMessage() }}</p>
              }

              @if (roomError()) {
                <p class="app-error">{{ roomError() }}</p>
              }

              @if (rooms().length === 0) {
                <p class="app-hint">{{ t('settings.noRooms') }}</p>
              } @else {
                <div class="app-list">
                  @for (room of rooms(); track room.id) {
                    <div class="app-list-item">
                      <div class="app-item-label">
                        <mat-chip-set>
                          <mat-chip>{{ room.is_default ? t('settings.defaultRoomBadge') : t('settings.myRoomBadge') }}</mat-chip>
                        </mat-chip-set>
                        <strong>{{ roomDisplayName(room) }}</strong>
                      </div>
                      @if (!room.is_default) {
                        <app-delete-btn [disabled]="busyRooms()" (confirm)="removeRoom(room.id)" />
                      }
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>


        </section>
      </main>
    </ng-container>
  `,
})
export class UserDashboardComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  protected readonly translocoService = inject(TranslocoService);
  private readonly ngZone = inject(NgZone);
  private readonly dialog = inject(MatDialog);

  protected readonly profileEmail = signal<string | null>(null);
  protected readonly profileRole = signal<AppRole | null>(null);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly taskMessage = signal('');
  protected readonly taskError = signal('');
  protected readonly busyTasks = signal(false);

  protected readonly rooms = signal<Room[]>([]);
  protected readonly roomMessage = signal('');
  protected readonly roomError = signal('');
  protected readonly busyRooms = signal(false);

  constructor() {
    void this.loadProfile();
    void this.loadTasks();
    void this.loadRooms();
  }

  protected openAddTask() {
    const t = this.translocoService;
    const ref = this.dialog.open(BilingualNameDialogComponent, {
      data: {
        title: t.translate('settings.addTask'),
        labelEn: t.translate('settings.taskNameEn'),
        labelDa: t.translate('settings.taskNameDa'),
      },
    });
    ref.afterClosed().subscribe((result: BilingualNameDialogResult | undefined) => {
      if (result) {
        void this.addTask(result.nameEn, result.nameDa);
      }
    });
  }

  protected openAddRoom() {
    const t = this.translocoService;
    const ref = this.dialog.open(BilingualNameDialogComponent, {
      data: {
        title: t.translate('settings.addRoom'),
        labelEn: t.translate('settings.roomNameEn'),
        labelDa: t.translate('settings.roomNameDa'),
      },
    });
    ref.afterClosed().subscribe((result: BilingualNameDialogResult | undefined) => {
      if (result) {
        void this.addRoom(result.nameEn, result.nameDa);
      }
    });
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

  protected taskDisplayName(task: Task): string {
    return this.isLanguage('da') ? task.name_da : task.name_en;
  }

  protected roomDisplayName(room: Room): string {
    return this.isLanguage('da') ? room.name_da : room.name_en;
  }

  private async addTask(nameEn: string, nameDa: string) {
    this.taskError.set('');
    this.taskMessage.set('');
    this.busyTasks.set(true);
    try {
      await this.supabaseService.addUserTask(nameEn, nameDa);
      this.taskMessage.set('Task added.');
      await this.loadTasks();
    } catch (error) {
      this.taskError.set(error instanceof Error ? error.message : 'Could not add task');
    } finally {
      this.busyTasks.set(false);
    }
  }

  protected async removeTask(taskId: string) {
    this.taskError.set('');
    this.taskMessage.set('');
    this.busyTasks.set(true);
    try {
      await this.supabaseService.removeUserTask(taskId);
      this.taskMessage.set('Task removed.');
      await this.loadTasks();
    } catch (error) {
      this.taskError.set(error instanceof Error ? error.message : 'Could not remove task');
    } finally {
      this.busyTasks.set(false);
    }
  }

  private async addRoom(nameEn: string, nameDa: string) {
    this.roomError.set('');
    this.roomMessage.set('');
    this.busyRooms.set(true);
    try {
      await this.supabaseService.addUserRoom(nameEn, nameDa);
      this.roomMessage.set('Room added.');
      await this.loadRooms();
    } catch (error) {
      this.roomError.set(error instanceof Error ? error.message : 'Could not add room');
    } finally {
      this.busyRooms.set(false);
    }
  }

  protected async removeRoom(roomId: string) {
    this.roomError.set('');
    this.roomMessage.set('');
    this.busyRooms.set(true);
    try {
      await this.supabaseService.removeUserRoom(roomId);
      this.roomMessage.set('Room removed.');
      await this.loadRooms();
    } catch (error) {
      this.roomError.set(error instanceof Error ? error.message : 'Could not remove room');
    } finally {
      this.busyRooms.set(false);
    }
  }

  private async loadProfile() {
    const profile = await this.supabaseService.getMyProfile();
    this.profileEmail.set(profile?.email ?? null);
    this.profileRole.set(profile?.role ?? null);
  }

  private async loadTasks() {
    const items = await this.supabaseService.listVisibleTasks();
    this.tasks.set(items.reverse());
  }

  private async loadRooms() {
    const items = await this.supabaseService.listVisibleRooms();
    this.rooms.set(items.reverse());
  }
}
