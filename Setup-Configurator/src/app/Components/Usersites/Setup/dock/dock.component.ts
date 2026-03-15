import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockItemComponent } from './dock-item.component';
import { DockManagementModalComponent } from './dock-management-modal.component';

@Component({
  selector: 'app-setup-dock',
  standalone: true,
  imports: [CommonModule, DockItemComponent, DockManagementModalComponent],
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.css']
})
export class SetupDockComponent {

  @Input() windows: any[] = [];
  @Output() restore = new EventEmitter<string>();
  @Output() maximize = new EventEmitter<string>();
  @Output() terminate = new EventEmitter<string>();
  @Output() dockItemRightClick = new EventEmitter<{ event: MouseEvent, window: any }>();

  isManagerOpen = false;

  toggleManager(event: MouseEvent) {
    event.stopPropagation();
    this.isManagerOpen = !this.isManagerOpen;
  }

  onRestore(id: string) {
    this.restore.emit(id);
    this.isManagerOpen = false;
  }
}
