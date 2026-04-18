import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-delete-btn',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconButton, MatIcon],
  template: `
    <button mat-icon-button class="app-delete-btn" type="button" [disabled]="disabled()" (click)="confirm.emit()">
      <mat-icon>delete</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    .app-delete-btn { color: #d32f2f !important; }
  `],
})
export class DeleteButtonComponent {
  readonly disabled = input(false);
  readonly confirm = output<void>();
}
