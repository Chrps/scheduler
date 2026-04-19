import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { RepeatMode, RepeatUnit, Room, SupabaseService, Task } from '../services/supabase.service';

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
    MatTooltipModule,
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
            <mat-label>{{ t('schedule.repeatLabel') }}</mat-label>
            <mat-select formControlName="repeatMode">
              <mat-option value="every">{{ t('schedule.modeEvery') }}</mat-option>
              <mat-option value="per">{{ t('schedule.modePer') }}</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="app-repeat-row">
            <mat-form-field appearance="outline" class="app-repeat-n">
              <input matInput type="number" formControlName="repeatEvery" min="1" max="99" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="app-repeat-unit">
              <mat-select formControlName="repeatUnit">
                <mat-option value="day">{{ repeatUnitLabel('day') }}</mat-option>
                <mat-option value="week">{{ repeatUnitLabel('week') }}</mat-option>
                <mat-option value="month">{{ repeatUnitLabel('month') }}</mat-option>
                <mat-option value="quarter">{{ repeatUnitLabel('quarter') }}</mat-option>
                <mat-option value="year">{{ repeatUnitLabel('year') }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <p class="app-hint app-repeat-preview">{{ repeatPreview() }}</p>

          <div class="app-date-row">
            <mat-form-field appearance="outline" class="app-date-field">
              <mat-label>{{ t('schedule.startDate') }}</mat-label>
              <input matInput type="date" formControlName="startDate" />
            </mat-form-field>
            <button
              mat-icon-button
              type="button"
              class="app-suggest-btn"
              [matTooltip]="t('schedule.suggestTooltip')"
              [disabled]="suggesting()"
              (click)="suggestStartDate()"
            >
              <mat-icon>auto_fix_high</mat-icon>
            </button>
          </div>
          @if (suggestHint()) {
            <p class="app-hint app-suggest-hint">{{ suggestHint() }}</p>
          }

          <mat-form-field appearance="outline">
            <mat-label>{{ t('schedule.endDate') }}</mat-label>
            <input matInput type="date" formControlName="endDate" />
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
  styles: [`
    :host { display: block; overflow: hidden; }
    :host ::ng-deep .mat-mdc-dialog-content { overflow-x: hidden; }
    :host ::ng-deep .mat-mdc-form-field { width: 100%; }
    .app-repeat-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
    }
    .app-repeat-n {
      flex: 0 0 72px;
      min-width: 0;
    }
    .app-repeat-unit {
      flex: 1;
      min-width: 0;
    }
    .app-repeat-preview {
      margin-top: -0.25rem;
      margin-bottom: 0.25rem;
      padding: 0.65rem 1rem;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(92, 138, 255, 0.1), rgba(94, 234, 212, 0.1));
      border: 1px solid rgba(92, 138, 255, 0.2);
      color: color-mix(in srgb, var(--mat-sys-primary, #5c8aff) 80%, black 15%);
      font-weight: 600;
      font-size: 0.95rem;
      text-align: center;
      letter-spacing: 0.01em;
    }
    .app-date-row {
      display: flex;
      gap: 0.25rem;
      align-items: flex-start;
    }
    .app-date-field {
      flex: 1;
      min-width: 0;
    }
    .app-suggest-btn {
      margin-top: 8px;
      flex-shrink: 0;
      color: var(--mat-sys-primary, #5c8aff);
    }
    .app-suggest-hint {
      margin-top: -0.5rem;
      padding: 0.65rem 1rem;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(92, 138, 255, 0.1), rgba(94, 234, 212, 0.1));
      border: 1px solid rgba(92, 138, 255, 0.2);
      color: color-mix(in srgb, var(--mat-sys-primary, #5c8aff) 80%, black 15%);
      font-weight: 600;
      font-size: 0.95rem;
      text-align: center;
      letter-spacing: 0.01em;
    }
  `],
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
  protected readonly suggesting = signal(false);
  protected readonly suggestHint = signal('');

  private readonly initialStart = this.data?.preselectedDate ?? new Date().toISOString().slice(0, 10);
  private lastStartDate = this.initialStart;

  protected readonly form = this.fb.nonNullable.group({
    taskId: ['', [Validators.required]],
    roomId: [null as string | null],
    repeatMode: ['every' as RepeatMode, [Validators.required]],
    repeatEvery: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    repeatUnit: ['week' as RepeatUnit, [Validators.required]],
    startDate: [this.initialStart, [Validators.required]],
    endDate: [this.defaultEndDate(this.initialStart), [Validators.required]],
  });

  protected repeatUnitLabel(unit: RepeatUnit): string {
    const t = this.translocoService;
    const n = this.form.controls.repeatEvery.value;
    const mode = this.form.controls.repeatMode.value;
    const key = `schedule.unitLabel.${unit}`;
    if (mode === 'per') {
      return t.translate(key + '.one');
    }
    return t.translate(n === 1 ? key + '.one' : key + '.other');
  }

  protected repeatPreview(): string {
    const t = this.translocoService;
    const { repeatMode, repeatEvery, repeatUnit } = this.form.getRawValue();
    const unitKey = `schedule.unitLabel.${repeatUnit}`;
    if (repeatMode === 'every') {
      // "Every N" always uses singular in Danish: "Hver 2. dag"
      const unit = t.translate(repeatEvery === 1 ? unitKey + '.one' : unitKey + '.one');
      return repeatEvery === 1
        ? `${t.translate('schedule.previewEvery')} ${unit}`
        : `${t.translate('schedule.previewEveryN')} ${repeatEvery}. ${unit}`;
    } else {
      // "N times per unit" uses the .per key: "3 gange om ugen"
      const perUnit = t.translate(unitKey + '.per');
      return repeatEvery === 1
        ? `${t.translate('schedule.previewOnceA')} ${perUnit}`
        : `${repeatEvery} ${t.translate('schedule.previewTimesA')} ${perUnit}`;
    }
  }

  private defaultEndDate(startStr: string): string {
    const d = new Date(startStr);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  async ngOnInit() {
    // Auto-update end date when start date changes (keep 1-year offset if user hasn't manually changed it)
    this.form.controls.startDate.valueChanges.subscribe((newStart) => {
      const currentEnd = this.form.controls.endDate.value;
      const oldDefault = this.defaultEndDate(this.lastStartDate);
      if (currentEnd === oldDefault) {
        this.form.controls.endDate.setValue(this.defaultEndDate(newStart));
      }
      this.lastStartDate = newStart;
    });

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

  protected async suggestStartDate() {
    this.suggesting.set(true);
    this.suggestHint.set('');

    try {
      const existingSchedules = await this.supabaseService.listSchedules();
      const { repeatMode, repeatEvery, repeatUnit } = this.form.getRawValue();

      // Determine the cycle length in days for the new schedule
      const cycleDays = this.getCycleDays(repeatMode, repeatEvery, repeatUnit);
      if (cycleDays <= 1) {
        // Daily tasks — any start date is equivalent
        this.suggestHint.set(this.translocoService.translate('schedule.suggestAlreadyOptimal'));
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const toDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // Generate existing event dates over the next 90 days
      const horizon = new Date(today);
      horizon.setDate(horizon.getDate() + 90);
      const existingCounts = new Map<string, number>();

      for (const s of existingSchedules) {
        const sCycleDays = this.getCycleDays(s.repeat_mode, s.repeat_every, s.repeat_unit);
        const start = new Date(s.start_date);
        const end = s.end_date ? new Date(s.end_date) : horizon;
        let cur = new Date(start);
        while (cur < today) {
          cur.setDate(cur.getDate() + sCycleDays);
        }
        while (cur <= end && cur <= horizon) {
          const key = toDateStr(cur);
          existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
          cur.setDate(cur.getDate() + sCycleDays);
        }
      }

      // Try each candidate start date from today to today + cycleDays
      let bestDate = today;
      let bestMaxPerDay = Infinity;

      for (let offset = 0; offset < cycleDays; offset++) {
        const candidate = new Date(today);
        candidate.setDate(candidate.getDate() + offset);

        // Simulate this candidate's events and find the peak day
        let maxPerDay = 0;
        let cur = new Date(candidate);
        while (cur <= horizon) {
          const key = toDateStr(cur);
          const total = (existingCounts.get(key) ?? 0) + 1;
          if (total > maxPerDay) maxPerDay = total;
          cur.setDate(cur.getDate() + cycleDays);
        }

        if (maxPerDay < bestMaxPerDay) {
          bestMaxPerDay = maxPerDay;
          bestDate = new Date(candidate);
        }
      }

      const bestStr = toDateStr(bestDate);
      // Ensure we never suggest a date before today
      const todayStr = toDateStr(today);
      const finalStr = bestStr < todayStr ? todayStr : bestStr;
      this.form.controls.startDate.setValue(finalStr);

      const t = this.translocoService;
      this.suggestHint.set(
        `${t.translate('schedule.suggestResult')} ${finalStr} (${t.translate('schedule.suggestMaxPerDay')}: ${bestMaxPerDay})`
      );
    } catch (e) {
      this.suggestHint.set(this.translocoService.translate('schedule.suggestError'));
    } finally {
      this.suggesting.set(false);
    }
  }

  private getCycleDays(mode: RepeatMode, every: number, unit: RepeatUnit): number {
    const unitDays: Record<RepeatUnit, number> = { day: 1, week: 7, month: 30, quarter: 91, year: 365 };
    if (mode === 'per') {
      return Math.max(1, Math.round(unitDays[unit] / every));
    }
    return every * unitDays[unit];
  }

  protected async save() {
    if (this.form.invalid) return;

    this.busy.set(true);
    this.error.set('');

    try {
      const { taskId, roomId, repeatMode, repeatEvery, repeatUnit, startDate, endDate } = this.form.getRawValue();
      await this.supabaseService.addSchedule(taskId, roomId, startDate, endDate, repeatEvery, repeatUnit, repeatMode);
      this.dialogRef.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save schedule');
    } finally {
      this.busy.set(false);
    }
  }
}
