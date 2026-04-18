import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface BilingualNameDialogData {
  title: string;
  labelEn: string;
  labelDa: string;
}

export interface BilingualNameDialogResult {
  nameEn: string;
  nameDa: string;
}

@Component({
  selector: 'app-bilingual-name-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="app-dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>{{ data.labelEn }}</mat-label>
          <input matInput type="text" formControlName="nameEn" cdkFocusInitial />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ data.labelDa }}</mat-label>
          <input matInput type="text" formControlName="nameDa" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">Add</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .app-dialog-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 320px;
      padding-top: 0.5rem;
    }
  `],
})
export class BilingualNameDialogComponent {
  protected readonly data = inject<BilingualNameDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BilingualNameDialogComponent>);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required]],
    nameDa: ['', [Validators.required]],
  });

  protected submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.getRawValue() as BilingualNameDialogResult);
    }
  }
}
