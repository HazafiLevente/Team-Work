import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
  ViewChild,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';

export type SetupItemRightClickPayload = {
  item: any;
  x: number;
  y: number;
};

@Component({
  selector: 'app-setup-item-card',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './setup-item-card.component.html',
  styleUrls: ['./setup-item-card.component.css']
})
export class SetupItemCardComponent implements OnInit, AfterViewInit {
  @Input() item: any;
  @Input() dataId = '';
  @Input() boundaryRef!: HTMLElement;
  @Input() dragDisabled = false;
  @Input() initialPosition: { x: number; y: number } = { x: 0, y: 0 };

  @Output() elementReady = new EventEmitter<{ id: string; el: HTMLElement }>();
  @Output() moved = new EventEmitter<void>();
  @Output() dragEnded = new EventEmitter<{ x: number; y: number }>();

  @Output() itemClick = new EventEmitter<any>();
  @Output() itemDblClick = new EventEmitter<any>();
  @Output() itemRightClick = new EventEmitter<SetupItemRightClickPayload>();
  @Output() renamed = new EventEmitter<any>();

  dragPosition = { x: 0, y: 0 };

  isRenaming = false;
  renameValue = '';

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;
  @ViewChild('renameInput') renameInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    if (this.initialPosition) {
      this.dragPosition = { ...this.initialPosition };
    }
  }

  ngAfterViewInit(): void {
    this.elementReady.emit({
      id: this.dataId,
      el: this.root.nativeElement
    });
  }

  get displayName(): string {
    return (
      this.item?.display_name ||
      this.item?.product_name ||
      this.item?.setup_name ||
      this.item?.name ||
      this.item?.model ||
      'Eszköz'
    );
  }

  isCircularNetworkType(): boolean {
    const rawValues = [
      this.item?.setup_type,
      this.item?.type,
      this.item?.device_type,
      this.item?.category,
      this.item?.source_table,
      this.item?.display_name,
      this.item?.setup_name,
      this.item?.name
    ];

    const normalized = rawValues
      .map((value) => String(value || '').toLowerCase().trim())
      .join(' ');

    return ['modem', 'router', 'switch'].some((token) => normalized.includes(token));
  }

  startRename(): void {
    this.isRenaming = true;
    this.renameValue = this.displayName;

    setTimeout(() => {
      const input = this.renameInput?.nativeElement;
      if (!input) return;
      input.focus();
      input.select();
    });
  }

  onRenameInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.renameValue = value;
  }

  cancelRename(): void {
    this.isRenaming = false;
    this.renameValue = '';
  }

  confirmRename(): void {
    if (!this.isRenaming) return;

    const newName = String(this.renameValue || '').trim();
    const oldName = String(this.displayName || '').trim();

    if (!newName) {
      this.cancelRename();
      return;
    }

    if (newName === oldName) {
      this.cancelRename();
      return;
    }

    this.renamed.emit({
      item: this.item,
      newName
    });

    this.isRenaming = false;
    this.renameValue = '';
  }

  onDragMoved(): void {
    if (this.isRenaming) return;
    this.moved.emit();
  }

  onDragEnded(e: any): void {
    if (this.isRenaming) return;

    const pos = e.source.getFreeDragPosition();
    this.dragPosition = pos;

    this.dragEnded.emit({
      x: pos.x,
      y: pos.y
    });
  }

  onClick(): void {
    if (this.isRenaming) return;
    this.itemClick.emit(this.item);
  }

  onDblClick(): void {
    if (this.isRenaming) return;
    this.itemDblClick.emit(this.item);
  }

  onRightClick(e: MouseEvent): void {
    if (this.isRenaming) return;

    e.preventDefault();
    e.stopPropagation();

    this.itemRightClick.emit({
      item: this.item,
      x: e.clientX,
      y: e.clientY
    });
  }
}
