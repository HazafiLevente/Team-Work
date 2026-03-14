import {
  Component,
  Input,
  Output,
  EventEmitter
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-setup-window',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './setup-window.component.html',
  styleUrls: ['./setup-window.component.css']
})
export class SetupWindowComponent {

  @Input() id = '';
  @Input() title = '';
  @Input() boundaryRef!: HTMLElement;

  @Input() x = 120;
  @Input() y = 100;
  @Input() zIndex = 6000;
  @Input() maximized = false;
  @Input() instanceNo: number | null = null;

  @Output() closed = new EventEmitter<string>();
  @Output() minimized = new EventEmitter<string>();
  @Output() focused = new EventEmitter<string>();
  @Output() maximizeToggled = new EventEmitter<string>();

  get dragPosition() {
    return { x: this.x, y: this.y };
  }

  get titleText(): string {
    return this.instanceNo && this.instanceNo > 1
      ? `${this.title} (${this.instanceNo})`
      : this.title;
  }

  onFocus(): void {
    this.focused.emit(this.id);
  }

  onClose(e?: MouseEvent): void {
    e?.stopPropagation();
    this.closed.emit(this.id);
  }

  onMinimize(e?: MouseEvent): void {
    e?.stopPropagation();
    this.minimized.emit(this.id);
  }

  onToggleMaximize(e?: MouseEvent): void {
    e?.stopPropagation();
    this.maximizeToggled.emit(this.id);
  }
}
