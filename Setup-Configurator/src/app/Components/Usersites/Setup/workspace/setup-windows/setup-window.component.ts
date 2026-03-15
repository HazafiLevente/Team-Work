import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  OnInit,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-setup-window',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './setup-window.component.html',
  styleUrls: ['./setup-window.component.css']
})
export class SetupWindowComponent {
  @Input() id!: string;
  @Input() title = 'Window';
  @Input() instanceNo = 1;
  @Input() width = 420;

  @Input() x = 200;
  @Input() y = 200;
  @Input() zIndex = 1000;

  @Input() maximized = false;
  @Input() boundaryRef!: HTMLElement;

  @Output() closed = new EventEmitter<string>();
  @Output() minimized = new EventEmitter<string>();
  @Output() focused = new EventEmitter<string>();
  @Output() maximizeToggled = new EventEmitter<string>();
  @Output() moved = new EventEmitter<{ x: number, y: number }>();

  @HostBinding('style.z-index') hostZIndex = 1;

  dragPosition = { x: 0, y: 0 };

  ngOnInit(): void {
    this.dragPosition = { x: this.x, y: this.y };
    this.hostZIndex = this.zIndex;
  }

  ngOnChanges(): void {
    this.hostZIndex = this.zIndex;

    if (!this.maximized) {
      // Csak akkor frissítjük a pozíciót fentről, ha tényleg változott az x/y
      // (megelőzve a végtelen ciklust visszacsatolásnál)
      if (Math.abs(this.dragPosition.x - this.x) > 1 || Math.abs(this.dragPosition.y - this.y) > 1) {
        this.dragPosition = { x: this.x, y: this.y };
      }
    }
  }

  focus(): void {
    this.focused.emit(this.id);
  }

  close(): void {
    this.closed.emit(this.id);
  }

  minimize(): void {
    this.minimized.emit(this.id);
  }

  toggleMaximize(): void {
    this.maximizeToggled.emit(this.id);
  }

  onDragEnded(event: CdkDragEnd): void {
    const pos = event.source.getFreeDragPosition();
    this.moved.emit({ x: pos.x, y: pos.y });
  }
}
