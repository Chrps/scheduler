import { ChangeDetectionStrategy, Component, inject, NgZone, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppRole, InviteRecord, Profile, Room, SupabaseService, Task } from '../services/supabase.service';
import { BilingualNameDialogComponent, BilingualNameDialogResult } from '../dialogs/bilingual-name-dialog.component';
import { DeleteButtonComponent } from '../components/delete-button.component';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    TranslocoModule,
    DeleteButtonComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <main class="app-page app-page-top">
        <section class="app-shell">
          <nav class="app-page-selector">
            <a mat-stroked-button routerLink="/">{{ t('nav.schedule') }}</a>
            <a mat-stroked-button routerLink="/settings">{{ t('nav.settings') }}</a>
            <a mat-stroked-button routerLink="/admin">{{ t('nav.admin') }}</a>
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
            <span class="app-kicker">Admin</span>
            <h1>Manage access with confidence.</h1>
            <p class="app-lead">
              Invite teammates, review pending access, and promote or demote roles from one place.
            </p>
          </header>

          <mat-card class="app-card-wide app-stack">
            <section class="app-surface-grid">
              <div class="app-surface-card app-stack-sm">
                <h2>{{ t('admin.inviteSection') }}</h2>
                <form [formGroup]="inviteForm" (ngSubmit)="inviteUser()" class="app-form-inline">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('admin.inviteEmail') }}</mat-label>
                    <input matInput type="email" formControlName="email" />
                  </mat-form-field>

                  <button mat-flat-button color="primary" type="submit" [disabled]="busy() || inviteForm.invalid">
                    <mat-icon>person_add</mat-icon>
                    {{ t('admin.invite') }}
                  </button>
                </form>
              </div>

              @if (message()) {
                <p class="app-msg">{{ message() }}</p>
              }

              @if (error()) {
                <p class="app-error">{{ error() }}</p>
              }

              <div class="app-surface-card app-stack-sm">
                <div class="app-title-row">
                  <h2>{{ t('admin.invitesSection') }}</h2>
                  <span class="app-hint">{{ invites().length }} pending</span>
                </div>

                @if (invites().length === 0) {
                  <p class="app-hint">No pending invites.</p>
                } @else {
                  <div class="app-list">
                    @for (invite of invites(); track invite.email) {
                      <div class="app-list-item">
                        <strong>{{ invite.email }}</strong>
                        <app-delete-btn [disabled]="busy()" (confirm)="removeInvite(invite.email)" />
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="app-surface-card app-stack-sm">
                <div class="app-title-row">
                  <h2>{{ t('admin.usersSection') }}</h2>
                  <span class="app-hint">{{ profiles().length }} total</span>
                </div>

                <div class="app-list">
                  @for (user of profiles(); track user.id) {
                    <div class="app-list-item">
                      <div class="app-item-label">
                        <mat-chip-set>
                          <mat-chip>{{ user.role }}</mat-chip>
                        </mat-chip-set>
                        <strong>{{ user.email ?? '(no email)' }}</strong>
                      </div>

                      <div class="app-actions">
                        <button
                          mat-stroked-button
                          type="button"
                          [disabled]="busy() || user.role === 'admin'"
                          (click)="changeRole(user.id, 'admin')"
                        >
                          <mat-icon>admin_panel_settings</mat-icon>
                          {{ t('admin.promoteAdmin') }}
                        </button>
                        <button
                          mat-stroked-button
                          type="button"
                          [disabled]="busy() || user.role === 'user'"
                          (click)="changeRole(user.id, 'user')"
                        >
                          <mat-icon>person</mat-icon>
                          {{ t('admin.demoteUser') }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="app-surface-card app-stack-sm">
                <div class="app-title-row">
                  <h2>{{ t('admin.defaultRoomsSection') }}</h2>
                  <span class="app-hint">{{ defaultRooms().length }} total</span>
                </div>

                <button mat-flat-button color="primary" class="app-add-btn" (click)="openAddDefaultRoom()">
                  <mat-icon>add_circle</mat-icon>
                  {{ t('admin.addDefaultRoom') }}
                </button>

                @if (defaultRooms().length === 0) {
                  <p class="app-hint">{{ t('admin.noDefaultRooms') }}</p>
                } @else {
                  <div class="app-list">
                    @for (room of defaultRooms(); track room.id) {
                      <div class="app-list-item">
                        <div class="app-item-label">
                          <strong>{{ roomDisplayName(room) }}</strong>
                          <span class="app-hint">EN: {{ room.name_en }} · DA: {{ room.name_da }}</span>
                        </div>
                        <app-delete-btn [disabled]="busy()" (confirm)="removeDefaultRoom(room.id)" />
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="app-surface-card app-stack-sm">
                <div class="app-title-row">
                  <h2>{{ t('admin.defaultTasksSection') }}</h2>
                  <span class="app-hint">{{ defaultTasks().length }} total</span>
                </div>

                <button mat-flat-button color="primary" class="app-add-btn" (click)="openAddDefaultTask()">
                  <mat-icon>add_circle</mat-icon>
                  {{ t('admin.addDefaultTask') }}
                </button>

                @if (defaultTasks().length === 0) {
                  <p class="app-hint">{{ t('admin.noDefaultTasks') }}</p>
                } @else {
                  <div class="app-list">
                    @for (task of defaultTasks(); track task.id) {
                      <div class="app-list-item">
                        <div class="app-item-label">
                          <strong>{{ taskDisplayName(task) }}</strong>
                          <span class="app-hint">EN: {{ task.name_en }} · DA: {{ task.name_da }}</span>
                        </div>
                        <app-delete-btn [disabled]="busy()" (confirm)="removeDefaultTask(task.id)" />
                      </div>
                    }
                  </div>
                }
              </div>
            </section>
          </mat-card>


        </section>
      </main>
    </ng-container>
  `,
})
export class AdminDashboardComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  protected readonly translocoService = inject(TranslocoService);
  private readonly ngZone = inject(NgZone);
  private readonly dialog = inject(MatDialog);

  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly profiles = signal<Profile[]>([]);
  protected readonly invites = signal<InviteRecord[]>([]);
  protected readonly defaultRooms = signal<Room[]>([]);
  protected readonly defaultTasks = signal<Task[]>([]);

  protected readonly inviteForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    void this.loadUsers();
    void this.loadInvites();
    void this.loadDefaultRooms();
    void this.loadDefaultTasks();
  }

  protected async inviteUser() {
    this.error.set('');
    this.message.set('');

    if (this.inviteForm.invalid) {
      return;
    }

    this.busy.set(true);
    try {
      const { email } = this.inviteForm.getRawValue();
      await this.supabaseService.inviteUser(email);
      this.message.set('Invite created. User can sign up with this email on /login.');
      this.inviteForm.reset({ email: '' });
      await this.loadInvites();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not invite user');
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeInvite(email: string) {
    this.error.set('');
    this.message.set('');

    this.busy.set(true);
    try {
      await this.supabaseService.revokeInvite(email);
      this.message.set('Invite revoked.');
      await this.loadInvites();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not revoke invite');
    } finally {
      this.busy.set(false);
    }
  }

  protected async changeRole(userId: string, role: AppRole) {
    this.error.set('');
    this.message.set('');

    this.busy.set(true);
    try {
      await this.supabaseService.setUserRole(userId, role);
      this.message.set(`Role updated to ${role}.`);
      await this.loadUsers();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not update role');
    } finally {
      this.busy.set(false);
    }
  }

  protected async signOut() {
    try {
      await this.supabaseService.signOut();
    } finally {
      this.ngZone.run(() => this.router.navigate(['/login']));
    }
  }

  protected openAddDefaultRoom() {
    const t = this.translocoService;
    const ref = this.dialog.open(BilingualNameDialogComponent, {
      data: {
        title: t.translate('admin.addDefaultRoom'),
        labelEn: t.translate('admin.defaultRoomNameEn'),
        labelDa: t.translate('admin.defaultRoomNameDa'),
      },
    });
    ref.afterClosed().subscribe((result: BilingualNameDialogResult | undefined) => {
      if (result) {
        void this.addDefaultRoom(result.nameEn, result.nameDa);
      }
    });
  }

  private async addDefaultRoom(nameEn: string, nameDa: string) {
    this.error.set('');
    this.message.set('');

    this.busy.set(true);
    try {
      await this.supabaseService.addDefaultRoom(nameEn, nameDa);
      this.message.set('Default room added.');
      await this.loadDefaultRooms();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not add default room');
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeDefaultRoom(roomId: string) {
    this.error.set('');
    this.message.set('');

    this.busy.set(true);
    try {
      await this.supabaseService.removeDefaultRoom(roomId);
      this.message.set('Default room removed.');
      await this.loadDefaultRooms();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not remove default room');
    } finally {
      this.busy.set(false);
    }
  }

  protected openAddDefaultTask() {
    const t = this.translocoService;
    const ref = this.dialog.open(BilingualNameDialogComponent, {
      data: {
        title: t.translate('admin.addDefaultTask'),
        labelEn: t.translate('admin.defaultTaskNameEn'),
        labelDa: t.translate('admin.defaultTaskNameDa'),
      },
    });
    ref.afterClosed().subscribe((result: BilingualNameDialogResult | undefined) => {
      if (result) {
        void this.addDefaultTask(result.nameEn, result.nameDa);
      }
    });
  }

  private async addDefaultTask(nameEn: string, nameDa: string) {
    this.error.set('');
    this.message.set('');

    this.busy.set(true);
    try {
      await this.supabaseService.addDefaultTask(nameEn, nameDa);
      this.message.set('Default task added.');
      await this.loadDefaultTasks();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not add default task');
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeDefaultTask(taskId: string) {
    this.error.set('');
    this.message.set('');

    this.busy.set(true);
    try {
      await this.supabaseService.removeDefaultTask(taskId);
      this.message.set('Default task removed.');
      await this.loadDefaultTasks();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not remove default task');
    } finally {
      this.busy.set(false);
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

  protected roomDisplayName(room: Room): string {
    return this.isLanguage('da') ? room.name_da : room.name_en;
  }

  protected taskDisplayName(task: Task): string {
    return this.isLanguage('da') ? task.name_da : task.name_en;
  }

  private async loadUsers() {
    const users = await this.supabaseService.listProfiles();
    this.profiles.set(users);
  }

  private async loadInvites() {
    const invites = await this.supabaseService.listInvites();
    this.invites.set(invites);
  }

  private async loadDefaultRooms() {
    const rooms = await this.supabaseService.listDefaultRooms();
    this.defaultRooms.set(rooms);
  }

  private async loadDefaultTasks() {
    const tasks = await this.supabaseService.listDefaultTasks();
    this.defaultTasks.set(tasks);
  }
}
