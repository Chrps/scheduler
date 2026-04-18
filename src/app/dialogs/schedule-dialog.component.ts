import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Room, ScheduleInterval, SupabaseService, Task } from '../services/supabase.service';

export interface ScheduleDialogData {
  preselectedDate?: string;
}

@Component({
  selector: 'app-schedule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslocoModule,
  ],
  template: `
    <ng-container *transloco="let t">
      <h2 mat-dialog-title>{{ t('schedule.addSchedule') }}</h2>

      <mat-dialog-content class="app-stack">
        <form [formGroup]="form" class="app-stack">
          <mat-form-field appearance="outline">
            <mat-label>{{ t('schedule.task') }}</mat-label>
            <mat-select formControlName="taskId">
              @for (task of tasks(); track task.id) {
                <mat-option [value]="task.id">{{ taskName(task) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ t('schedule.room') }}</mat-label>
            <mat-select formControlName="roomId">
              <mat-option [value]="null">{{ t('schedule.roomNone') }}</mat-option>
              @for (room of rooms(); track room.id) {
                <mat-option [value]="room.id">{{ roomName(room) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ t('schedule.interval') }}</mat-label>
            <mat-select formControlName="interval">
              <mat-option value="daily">{{ t('schedule.intervalDaily') }}</mat-option>
              <mat-option value="weekly">{{ t('schedule.intervalWeekly') }}</mat-option>
              <mat-option value="biweekly">{{ t('schedule.intervalBiweekly') }}</mat-option>
              <mat-option value="monthly">{{ t('schedule.intervalMonthly') }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ t('schedule.startDate') }}</mat-label>
            <input matInput type="date" formControlName="startDate" />
          </mat-form-field>
        </form>

        @if (error()) {
          <p class="app-error">{{ error() }}</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">{{ t('schedule.cancel') }}</button>
        <button mat-flat-button color="primary" [disabled]="busy() || form.invalid" (click)="save()">
          <mat-icon>save</mat-icon>
          {{ t('schedule.save') }}
        </button>
      </mat-dialog-actions>
    </ng-container>
  `,
})
export class ScheduleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabaseService = inject(SupabaseService);
  private readonly translocoService = inject(TranslocoService);
  private readonly data = inject<ScheduleDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly dialogRef = inject(MatDialogRef<ScheduleDialogComponent>);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly rooms = signal<Room[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    taskId: ['', [Validators.required]],
    roomId: [null as string | null],
    interval: ['weekly' as ScheduleInterval, [Validators.required]],
    startDate: [this.data?.preselectedDate ?? new Date().toISOString().slice(0, 10), [Validators.required]],
  });

  async ngOnInit() {
    const [tasks, rooms] = await Promise.all([
      this.supabaseService.listVisibleTasks(),
      this.supabaseService.listVisibleRooms(),
    ]);
    this.tasks.set(tasks);
    this.rooms.set(rooms);
  }

  protected taskName(task: Task): string {
    return this.translocoService.getActiveLang() === 'da' ? task.name_da : task.name_en;
  }

  protected roomName(room: Room): string {
    return this.translocoService.getActiveLang() === 'da' ? room.name_da : room.name_en;
  }

  protected async save() {
    if (this.form.invalid) return;

    this.busy.set(true);
    this.error.set('');

    try {
      const { taskId, roomId, interval, startDate } = this.form.getRawValue();
      await this.supabaseService.addSchedule(taskId, roomId, startDate, interval);
      this.dialogRef.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save schedule');
    } finally {
      this.busy.set(false);
    }
  }
}
