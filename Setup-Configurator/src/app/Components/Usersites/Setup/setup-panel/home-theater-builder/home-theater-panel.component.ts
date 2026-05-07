import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';
import {HomeTheaterBuilderComponent} from './ht-builder/home-theater-builder.component';

@Component({
  selector: 'app-home-theater-panel',
  standalone: true,
  templateUrl: './home-theater-panel.component.html',
  styleUrls: ['./home-theater-panel.component.css'],
  imports: [CdkDrag, HomeTheaterBuilderComponent]
})
export class HomeTheaterPanelComponent {

  @Input() boundaryRef!: HTMLElement;

  @Output() minimized = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isMaximized = false;

  toggleMaximize(){

    this.isMaximized = !this.isMaximized;

  }
  minimize() {
    this.minimized.emit();
  }

  close() {
    this.closed.emit();
  }

}
