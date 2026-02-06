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

  onDblClick() {
    // Jelezzük a szülőnek, hogy ránk kattintottak
    this.setupDblClick.emit(this.setup);
  }
}
