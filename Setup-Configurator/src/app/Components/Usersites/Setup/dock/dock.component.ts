import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-setup-dock',
  standalone: true,
  imports: [CommonModule,
  ],
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.css']
})
export class SetupDockComponent {

  @Input() windows: any[] = [];
  @Output() restore = new EventEmitter<string>();
  @Output() maximize = new EventEmitter<string>();
  @Output() terminate = new EventEmitter<string>();
  @Output() showDesktop = new EventEmitter<void>();
  @Output() dockItemRightClick = new EventEmitter<{ event: MouseEvent, window: any }>();

  isManagerOpen = false;

  toggleManager(event: MouseEvent) {
    event.stopPropagation();
    this.isManagerOpen = !this.isManagerOpen;
  }

  openManager(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isManagerOpen = true;
  }

  onRestore(id: string) {
    this.restore.emit(id);
    this.isManagerOpen = false;
  }

  onShowDesktop() {
    this.showDesktop.emit();
  }
}
