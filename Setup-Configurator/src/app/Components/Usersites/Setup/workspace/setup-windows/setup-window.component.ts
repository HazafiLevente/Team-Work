import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  HostListener,
  ElementRef,
  ViewChild,
  OnInit,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';

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
  @Input() height: number | null = null;
  @Input() snapMode: 'left' | 'right' | null = null;

  @Input() x = 200;
  @Input() y = 200;
  @Input() zIndex = 1000;

  @Input() maximized = false;
  @Input() boundaryRef!: HTMLElement;
  @Input() topInset = 0;

  @Output() closed = new EventEmitter<string>();
  @Output() minimized = new EventEmitter<string>();
  @Output() focused = new EventEmitter<string>();
  @Output() maximizeToggled = new EventEmitter<string>();
  @Output() moved = new EventEmitter<{ x: number, y: number }>();
  @Output() dragMoved = new EventEmitter<{ x: number, y: number }>();
  @Output() resized = new EventEmitter<{ width: number, height: number, x: number, y: number }>();

  @HostBinding('style.z-index') hostZIndex = 1;
  @ViewChild('windowEl', { static: true }) windowEl!: ElementRef<HTMLElement>;

  dragPosition = { x: 0, y: 0 };
  resizing = false;
  private resizeDirection = '';
  private resizeStart = {
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0
  };
  private readonly minWidth = 420;
  private readonly minHeight = 250;

  get activeDragPosition(): { x: number; y: number } {
    return this.maximized ? { x: 0, y: this.topInset } : this.dragPosition;
  }

  get maximizedWidth(): number | null {
    if (!this.maximized) return null;
    return this.boundaryRef?.clientWidth || null;
  }

  get maximizedHeight(): number | null {
    if (!this.maximized) return null;
    const height = this.boundaryRef?.clientHeight;
    return height ? Math.max(this.minHeight, height - this.topInset) : null;
  }

  get activeHeight(): number | null {
    return this.maximized ? this.maximizedHeight : this.height;
  }

  ngOnInit(): void {
    this.dragPosition = { x: this.x, y: this.y };
    this.hostZIndex = this.zIndex;
  }

  ngOnChanges(): void {
    this.hostZIndex = this.zIndex;

    if (!this.maximized) {


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

  constrainDragPosition = (point: { x: number; y: number }): { x: number; y: number } => {
    const boundary = this.boundaryRef?.getBoundingClientRect();
    const windowRect = this.windowEl?.nativeElement.getBoundingClientRect();

    if (!boundary || !windowRect) return point;

    const minX = boundary.left;
    const minY = boundary.top + this.topInset;
    return {
      x: point.x,
      y: Math.max(point.y, minY)
    };
  };

  minimize(): void {
    this.minimized.emit(this.id);
  }

  toggleMaximize(): void {
    this.maximizeToggled.emit(this.id);
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.focus();
  }

  onDragMoved(event: CdkDragMove): void {
    const pos = event.source.getFreeDragPosition();
    this.dragMoved.emit({ x: pos.x, y: pos.y });
  }

  onDragEnded(event: CdkDragEnd): void {
    const pos = event.source.getFreeDragPosition();
    this.moved.emit({ x: pos.x, y: pos.y });
  }

  startResize(event: MouseEvent, direction: string): void {
    if (this.maximized) return;

    event.preventDefault();
    event.stopPropagation();
    this.focus();

    const rect = this.windowEl.nativeElement.getBoundingClientRect();
    this.resizing = true;
    this.resizeDirection = direction;
    this.resizeStart = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: rect.width,
      height: rect.height,
      x: this.dragPosition.x,
      y: this.dragPosition.y
    };
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.resizing) return;

    event.preventDefault();

    const dx = event.clientX - this.resizeStart.mouseX;
    const dy = event.clientY - this.resizeStart.mouseY;

    let nextWidth = this.resizeStart.width;
    let nextHeight = this.resizeStart.height;
    let nextX = this.resizeStart.x;
    let nextY = this.resizeStart.y;

    if (this.resizeDirection.includes('e')) {
      nextWidth = this.resizeStart.width + dx;
    }

    if (this.resizeDirection.includes('s')) {
      nextHeight = this.resizeStart.height + dy;
    }

    if (this.resizeDirection.includes('w')) {
      nextWidth = this.resizeStart.width - dx;
      nextX = this.resizeStart.x + dx;
    }

    if (this.resizeDirection.includes('n')) {
      nextHeight = this.resizeStart.height - dy;
      nextY = this.resizeStart.y + dy;
    }

    if (nextWidth < this.minWidth) {
      if (this.resizeDirection.includes('w')) {
        nextX -= this.minWidth - nextWidth;
      }
      nextWidth = this.minWidth;
    }

    if (nextHeight < this.minHeight) {
      if (this.resizeDirection.includes('n')) {
        nextY -= this.minHeight - nextHeight;
      }
      nextHeight = this.minHeight;
    }

    const boundaryWidth = this.boundaryRef?.clientWidth ?? Number.POSITIVE_INFINITY;
    const boundaryHeight = this.boundaryRef?.clientHeight ?? Number.POSITIVE_INFINITY;

    nextX = Math.max(0, nextX);
    if (nextY < this.topInset) {
      if (this.resizeDirection.includes('n')) {
        nextHeight = Math.max(this.minHeight, nextHeight - (this.topInset - nextY));
      }
      nextY = this.topInset;
    }
    nextWidth = Math.min(nextWidth, Math.max(this.minWidth, boundaryWidth - nextX));
    nextHeight = Math.min(nextHeight, Math.max(this.minHeight, boundaryHeight - nextY));

    this.dragPosition = { x: nextX, y: nextY };
    this.resized.emit({
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
      x: Math.round(nextX),
      y: Math.round(nextY)
    });
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this.resizing = false;
    this.resizeDirection = '';
  }
}
