import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextMenuBaseComponent } from '../context-menu-base/context-menu-base.component';

@Component({
  selector: 'app-context-menu-room',
  standalone:true,
  imports:[CommonModule,ContextMenuBaseComponent],
  templateUrl:'./context-menu-room.component.html',
  styleUrl:'./context-menu-room.component.css'
})
export class ContextMenuRoomComponent{

  @Input() x=0;
  @Input() y=0;

  @Output() close = new EventEmitter<void>();

  @Output() openSetup = new EventEmitter<void>();
  @Output() openTools = new EventEmitter<void>();
  @Output() rename = new EventEmitter<void>();
  @Output() connect = new EventEmitter<void>();
  @Output() connections = new EventEmitter<void>();
  @Output() deleteSetup = new EventEmitter<void>();

  emitAndClose(emitter: EventEmitter<void>) {
    emitter.emit();
    this.close.emit();
  }
}
