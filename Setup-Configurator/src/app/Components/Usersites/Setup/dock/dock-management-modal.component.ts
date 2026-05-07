import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dock-management-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dock-manager">
      <div class="manager-header">
        <h3>Ablakkezelő</h3>
        <button class="close-btn" (click)="close.emit()">×</button>
      </div>

      <div class="window-list">
        @for (w of windows; track w.id) {
          <div class="window-entry" [class.minimized]="w.minimized">
            <div class="window-info">
              <span class="window-icon">🗔</span>
              <span class="window-name">{{ w.title }}</span>
            </div>

            <div class="window-actions">
              <button class="action-btn" title="Visszaállítás" (click)="onRestore(w.id)">
                <span>⤴</span>
              </button>
              <button class="action-btn" title="Nagyítás" (click)="onMaximize(w.id)">
                <span>🗖</span>
              </button>
              <button class="action-btn danger" title="Bezárás" (click)="terminate.emit(w.id)">
                <span>×</span>
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">Nincs aktív ablak</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dock-manager {
      position: absolute;
      bottom: 70px;
      left: 10px;
      width: 280px;
      background: rgba(15, 11, 26, 0.9);
      backdrop-filter: blur(25px);
      border: 1px solid rgba(82, 39, 255, 0.4);
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      padding: 12px;
      z-index: 10005;
      animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .manager-header h3 {
      margin: 0;
      font-size: 14px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }

    .window-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .window-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .window-entry:hover {
      background: rgba(82, 39, 255, 0.1);
      border-color: rgba(82, 39, 255, 0.2);
    }

    .window-entry.minimized {
      opacity: 0.7;
    }

    .window-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .window-icon {
      color: #3b82f6;
      font-size: 14px;
    }

    .window-name {
      font-size: 13px;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .window-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(82, 39, 255, 0.2);
      color: #fff;
    }

    .action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-style: italic;
      font-size: 13px;
    }
  `]
})
export class DockManagementModalComponent {
  @Input() windows: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() restore = new EventEmitter<string>();
  @Output() maximize = new EventEmitter<string>();
  @Output() terminate = new EventEmitter<string>();

  constructor(private elementRef: ElementRef) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.close.emit();
    }
  }

  onRestore(id: string): void {
    this.restore.emit(id);
    this.close.emit();
  }

  onMaximize(id: string): void {
    this.maximize.emit(id);
    this.close.emit();
  }
}
