import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { RepeatUnit, Room, SupabaseService, Task } from '../services/supabase.service';

export type ScheduleDialogResult = {
  taskId: string;
  roomId: string | null;
  startDate: string;
  repeatEvery: number;
  repeatUnit: RepeatUnit;
};

@Component({
  selector: 'app-add-schedule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatNativeDateModule,
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
            <input matInput [matDatepicker]="picker" formControlName="startDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">{{ t('schedule.cancel') }}</button>
        <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">
          {{ t('schedule.save') }}
        </button>
      </mat-dialog-actions>
    </ng-container>
  `,
})
export class AddScheduleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddScheduleDialogComponent>);
  private readonly supabaseService = inject(SupabaseService);
  private readonly translocoService = inject(TranslocoService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly rooms = signal<Room[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    taskId: ['', Validators.required],
    roomId: [null as string | null],
    interval: ['weekly' as RepeatUnit, Validators.required],
    startDate: [new Date(), Validators.required],
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

  protected onCancel() {
    this.dialogRef.close();
  }

  protected onSave() {
    if (this.form.invalid) return;

    const { taskId, roomId, interval, startDate } = this.form.getRawValue();
    const dateStr = formatDate(startDate);

    this.dialogRef.close({
      taskId,
      roomId,
      startDate: dateStr,
      repeatEvery: 1,
      repeatUnit: interval,
    } satisfies ScheduleDialogResult);
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
