import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextMenuBaseComponent } from '../context-menu-base/context-menu-base.component';

@Component({
  selector: 'app-context-menu-item',
  standalone: true,
  imports: [CommonModule, ContextMenuBaseComponent],
  templateUrl: './context-menu-item.component.html',
  styleUrls: ['./context-menu-item.component.css']
})
export class ContextMenuItemComponent {
  @Input() x = 0;
  @Input() y = 0;

  @Output() close = new EventEmitter<void>();

  @Output() openItem = new EventEmitter<void>();
  @Output() rename = new EventEmitter<void>();
  @Output() modify = new EventEmitter<void>();
  @Output() connectItem = new EventEmitter<void>();
  @Output() deleteItem = new EventEmitter<void>();

  emitAndClose(emitter: EventEmitter<void>) {
    emitter.emit();
    this.close.emit();
  }
}
