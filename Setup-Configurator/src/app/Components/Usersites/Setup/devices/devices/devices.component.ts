import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.css']
})
export class DevicesComponent implements OnInit, OnChanges {

  @Input() device: any;
  @Input() dataId = '';
  @Input() boundaryEl: HTMLElement | null = null;
  @Input() x = 0;
  @Input() y = 0;
  @Input() editing = false;

  @Output() dragEnded = new EventEmitter<{ device: any; pos: { x: number; y: number } }>();
  @Output() deviceClick = new EventEmitter<any>();
  @Output() deviceDblClick = new EventEmitter<any>();
  @Output() deviceRightClick = new EventEmitter<{ device: any; x: number; y: number }>();
  @Output() renamed = new EventEmitter<any>();

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;

  position = { x: 0, y: 0 };
  editName = '';

  dragging = false;
  private pointerOffset = { x: 0, y: 0 };

  ngOnInit(): void {
    this.position = {
      x: Number(this.x || 0),
      y: Number(this.y || 0)
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['x'] || changes['y']) && !this.dragging) {
      this.position = {
        x: Number(this.x || 0),
        y: Number(this.y || 0)
      };
    }

    if (changes['editing'] && this.editing) {
      this.editName = this.getTitle();

      setTimeout(() => {
        const input = this.root.nativeElement.querySelector('input') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      });
    }
  }

  getType(): string {
    const cat = String(this.device?.category || '').toLowerCase();

    if (cat.includes('pc')) return 'PC';
    if (cat.includes('router')) return 'Router';
    if (cat.includes('switch')) return 'Switch';
    if (cat.includes('modem')) return 'Modem';

    return 'Device';
  }

  getTitle(): string {
    return this.device?.display_name || this.device?.name || 'Device';
  }

  startDrag(event: MouseEvent) {

    if (this.editing) return;

    this.dragging = true;

    this.pointerOffset = {
      x: event.clientX - this.position.x,
      y: event.clientY - this.position.y
    };

    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {

    if (!this.dragging) return;

    this.position = {
      x: event.clientX - this.pointerOffset.x,
      y: event.clientY - this.pointerOffset.y
    };
  }

  @HostListener('document:mouseup')
  stopDrag() {

    if (!this.dragging) return;

    this.dragging = false;

    this.dragEnded.emit({
      device: this.device,
      pos: { ...this.position }
    });
  }

  onClick(event: MouseEvent) {
    event.stopPropagation();
    this.deviceClick.emit(this.device);
  }

  onDblClick(event: MouseEvent) {
    event.stopPropagation();
    this.deviceDblClick.emit(this.device);
  }

  onRightClick(event: MouseEvent) {

    event.preventDefault();
    event.stopPropagation();

    this.deviceRightClick.emit({
      device: this.device,
      x: event.clientX,
      y: event.clientY
    });
  }

  confirmRename() {

    if (!this.editName.trim()) return;

    this.device.display_name = this.editName.trim();
    this.editing = false;

    this.renamed.emit(this.device);
  }

}
