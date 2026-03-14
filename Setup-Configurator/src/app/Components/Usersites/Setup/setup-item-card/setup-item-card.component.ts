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

  dragPosition = { x: 0, y: 0 };

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;

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

  onDragMoved(): void {
    this.moved.emit();
  }

  onDragEnded(e: any): void {
    const pos = e.source.getFreeDragPosition();
    this.dragPosition = pos;

    this.dragEnded.emit({
      x: pos.x,
      y: pos.y
    });
  }

  onClick(): void {
    this.itemClick.emit(this.item);
  }

  onDblClick(): void {
    this.itemDblClick.emit(this.item);
  }

  onRightClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    this.itemRightClick.emit({
      item: this.item,
      x: e.clientX,
      y: e.clientY
    });
  }
}
