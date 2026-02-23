import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';

export type SetupRightClickPayload = {
  setup: any;
  x: number;
  y: number;
};

@Component({
  selector: 'app-setup-room',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './setup-room.component.html',
  styleUrls: ['./setup-room.component.css']
})
export class SetupRoomComponent implements AfterViewInit {
  @Input() setup: any;
  @Input() boundaryRef!: HTMLElement;
  @Input() dataId: string = '';
  @Input() initialPosition: { x: number; y: number } = { x: 0, y: 0 };

  @Output() setupDblClick = new EventEmitter<any>();
  @Output() setupRightClick = new EventEmitter<SetupRightClickPayload>();
  @Output() moved = new EventEmitter<void>();
  @Output() dragEnded = new EventEmitter<{ x: number; y: number }>();

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;

  @Output() elementReady = new EventEmitter<{ id: string; el: HTMLElement }>();

  ngAfterViewInit(): void {
    if (this.dataId) {
      this.elementReady.emit({
        id: this.dataId,
        el: this.root.nativeElement
      });
    }
  }


  private lastClickAt = 0;
  private dragging = false;

  private toBool(v: any): boolean {
    if (v === true || v === false) return v;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
    }
    return false;
  }

  isNetwork(): boolean {
    const s = this.setup || {};
    return this.toBool(s.isNetwork ?? s.is_network ?? s.network);
  }

  onDragStarted(): void {
    this.dragging = true;
  }

  onDragEnded(event: any): void {
    const offset = event.source.getFreeDragPosition();
    this.dragEnded.emit(offset);
    setTimeout(() => (this.dragging = false), 0);
  }

  private moveRaf: number | null = null;

  onDragMoved(): void {
    if (this.moveRaf) return;

    this.moveRaf = requestAnimationFrame(() => {
      this.moveRaf = null;
      this.moved.emit();
    });
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

  onRightClick(e: MouseEvent): void {
    if (!this.setup) return;

    e.preventDefault();
    e.stopPropagation();
    if (this.dragging) return;

    this.setupRightClick.emit({
      setup: this.setup,
      x: e.clientX,
      y: e.clientY
    });
  }
}
