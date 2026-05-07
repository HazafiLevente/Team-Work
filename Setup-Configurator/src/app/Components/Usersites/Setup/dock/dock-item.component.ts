import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dock-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="taskbar-item" [class.minimized]="window.minimized"
      (click)="restore.emit(window.id)"
      (contextmenu)="onRightClick($event)">
      <span class="taskbar-icon">🗔</span>
      <span class="taskbar-title">{{window.title}}</span>
    </button>
  `,
  styles: [`
    .taskbar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 36px;
      min-width: 120px;
      max-width: 200px;
      padding: 0 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }

    .taskbar-item:hover {
      background: rgba(59, 44, 255, 0.15);
      border-color: rgba(59, 44, 255, 0.5);
    }

    .taskbar-item.minimized {
      opacity: 0.6;
    }

    .taskbar-item.minimized:hover {
      opacity: 1;
    }

    .taskbar-icon {
      font-size: 14px;
      color: #00a8ff;
    }

    .taskbar-title {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }
  `]
})
export class DockItemComponent {
  @Input() window: any;
  @Output() restore = new EventEmitter<string>();
  @Output() rightClick = new EventEmitter<{ event: MouseEvent, window: any }>();

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.rightClick.emit({ event, window: this.window });
  }
}
