import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-setup-room',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './setup-room.component.html',
  styleUrls: ['./setup-room.component.css']
})
export class SetupRoomComponent {
  @Input() setup: any;
  @Input() boundaryRef: any;
  @Output() setupDblClick = new EventEmitter<any>();

  private lastClickAt = 0;
  private dragging = false;

  onDragStarted(): void {
    this.dragging = true;
  }

  onDragEnded(): void {
    setTimeout(() => (this.dragging = false), 0);
  }

  onClick(): void {
    if (!this.setup) return;
    if (this.dragging) return;

    const now = Date.now();
    const diff = now - this.lastClickAt;
    this.lastClickAt = now;

    if (diff > 0 && diff < 320) {
      this.setupDblClick.emit(this.setup);
    }
  }
}
