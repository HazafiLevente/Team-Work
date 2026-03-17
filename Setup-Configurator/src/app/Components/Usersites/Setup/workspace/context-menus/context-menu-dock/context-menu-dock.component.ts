import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextMenuBaseComponent } from '../context-menu-base/context-menu-base.component';

@Component({
    selector: 'app-context-menu-dock',
    standalone: true,
    imports: [CommonModule, ContextMenuBaseComponent],
    template: `
    <app-context-menu-base [x]="x" [y]="y" (close)="close.emit()">
      <div class="menu-section">
        <button class="menu-item" (click)="restore.emit(); close.emit()">
          <span>⤴</span> Visszaállítás
        </button>
        <button class="menu-item" (click)="maximize.emit(); close.emit()">
          <span>🗖</span> Nagyítás / Kicsinyítés
        </button>
      </div>
      
      <div class="menu-separator"></div>
      
      <div class="menu-section">
        <button class="menu-item danger" (click)="terminate.emit(); close.emit()">
          <span>×</span> Bezárás
        </button>
      </div>
    </app-context-menu-base>
  `,
    styles: [`
    .menu-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .menu-item {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13.5px;
      color: #e2e8f0;
      background: transparent;
      border: none;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
    }

    .menu-item:hover {
      background: rgba(82, 39, 255, 0.2);
      color: #fff;
      transform: translateX(4px);
    }

    .menu-separator {
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(82, 39, 255, 0.4), transparent);
      margin: 6px 0;
    }

    .menu-item.danger {
      color: #fda4af;
    }

    .menu-item.danger:hover {
      background: rgba(244, 63, 94, 0.15);
      color: #ff4d4d;
    }
  `]
})
export class ContextMenuDockComponent {
    @Input() x = 0;
    @Input() y = 0;

    @Output() close = new EventEmitter<void>();
    @Output() restore = new EventEmitter<void>();
    @Output() maximize = new EventEmitter<void>();
    @Output() terminate = new EventEmitter<void>();
}
