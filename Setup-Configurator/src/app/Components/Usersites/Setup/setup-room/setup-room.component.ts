import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';

export type SetupRightClickPayload = {
  setup: any;
  x: number;
  y: number;
  component: SetupRoomComponent; // 👈 fontos
};

@Component({
  selector: 'app-setup-room',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './setup-room.component.html',
  styleUrls: ['./setup-room.component.css']
})
export class SetupRoomComponent implements AfterViewInit {

  @Input() setup: any;
  @Input() boundaryRef!: HTMLElement;
  @Input() dataId: string = '';
  @Input() initialPosition: { x: number; y: number } = { x: 0, y: 0 };
  @Input() dragDisabled: boolean = false;

  @Output() setupDblClick = new EventEmitter<any>();
  @Output() setupClick = new EventEmitter<any>();
  @Output() setupRightClick = new EventEmitter<SetupRightClickPayload>();
  @Output() moved = new EventEmitter<void>();
  @Output() dragEnded = new EventEmitter<{ x: number; y: number }>();
  @Output() elementReady = new EventEmitter<{ id: string; el: HTMLElement }>();
  @Output() renamed = new EventEmitter<any>();

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;

  private http = inject(HttpClient);

  editing = false;
  editName = '';
  saving = false;

  private lastClickAt = 0;
  private dragging = false;
  private moveRaf: number | null = null;

  ngAfterViewInit(): void {
    if (this.dataId) {
      this.elementReady.emit({
        id: this.dataId,
        el: this.root.nativeElement
      });
    }
  }

  // ================= DRAG =================

  onDragStarted(): void {
    this.dragging = true;
  }

  onDragEnded(event: any): void {
    const offset = event.source.getFreeDragPosition();
    this.dragEnded.emit(offset);
    setTimeout(() => (this.dragging = false), 0);
  }

  onDragMoved(): void {
    if (this.moveRaf) return;

    this.moveRaf = requestAnimationFrame(() => {
      this.moveRaf = null;
      this.moved.emit();
    });
  }

  // ================= CLICK =================

  onClick(): void {
    if (!this.setup || this.dragging) return;

    this.setupClick.emit(this.setup);

    const now = Date.now();
    const diff = now - this.lastClickAt;
    this.lastClickAt = now;

    if (diff > 0 && diff < 320) {
      this.setupDblClick.emit(this.setup);
    }
  }

  // ================= RIGHT CLICK =================

  onRightClick(e: MouseEvent): void {
    if (!this.setup || this.dragging) return;

    e.preventDefault();
    e.stopPropagation();

    this.setupRightClick.emit({
      setup: this.setup,
      x: e.clientX,
      y: e.clientY,
      component: this  // 👈 EZ KELL
    });
  }

  // ================= INLINE RENAME =================

  startRename(): void {
    this.editName =
      this.setup?.display_name ||
      this.setup?.setup_name ||
      this.setup?.name ||
      '';

    this.editing = true;

    setTimeout(() => {
      const input = this.root.nativeElement.querySelector('input');
      input?.focus();
      input?.select();
    });
  }

  cancelRename(): void {
    this.editing = false;
    this.editName = '';
  }

  confirmRename(): void {
    const name = (this.editName || '').trim();
    if (!name) {
      this.cancelRename();
      return;
    }

    const setupId =
      this.setup?.id ??
      this.setup?.setup_id ??
      this.setup?.setupId;

    if (!setupId) return;

    this.saving = true;

    this.http.patch<any>(`/api/setup/${setupId}`, { setup_name: name }, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const updated = res?.setup ?? { ...this.setup, setup_name: name };
          this.setup = { ...this.setup, ...updated };
          this.renamed.emit(this.setup);
          this.editing = false;
          this.saving = false;
        },
        error: (err) => {
          console.error('Rename hiba:', err);
          this.saving = false;
          this.cancelRename();
        }
      });
  }

  // ================= NETWORK STYLE =================

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
}
