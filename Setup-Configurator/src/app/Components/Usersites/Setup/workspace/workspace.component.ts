import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { SetupRoomComponent } from '../setup-room/setup-room.component';
import { SetupItemCardComponent } from '../setup-item-card/setup-item-card.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupConnectionsComponent } from './connection-layer/setup-connections.component';
import { ContextMenuRoomComponent } from './context-menus/context-menu-room/context-menu-room.component';
import { ContextMenuBaseComponent } from './context-menus/context-menu-base/context-menu-base.component';
import { ContextMenuItemComponent } from './context-menus/context-menu-item/context-menu-item.component';

@Component({
  selector: 'app-workspace',
  standalone: true,
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css'],
  imports: [
    CommonModule,
    SetupRoomComponent,
    SetupItemCardComponent,
    DotGridComponent,
    SetupConnectionsComponent,
    ContextMenuRoomComponent,
    ContextMenuBaseComponent,
    ContextMenuItemComponent
  ]
})
export class WorkspaceComponent {
  @Input() lineRefreshTrigger = 0;
  @Input() connectMousePos: any = { x: 0, y: 0 };
  @Input() connectSourceSetup: any = null;
  @Input() pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';

  @Input() userSetups: any[] = [];
  @Input() items: any[] = [];
  @Input() connections: any[] = [];
  @Input() globalRoomConnections: any[] = [];
  @Input() viewingSetup: any = null;
  @Input() loading = false;
  @Input() loadingItems = false;

  @Output() openTools = new EventEmitter<any>();
  @Output() rename = new EventEmitter<any>();
  @Output() connect = new EventEmitter<any>();
  @Output() connections2 = new EventEmitter<void>();
  @Output() deleteSetup = new EventEmitter<any>();
  @Output() openConnections = new EventEmitter<void>();

  @Output() back = new EventEmitter<void>();
  @Output() roomMoved = new EventEmitter<{ setup: any; pos: any }>();
  @Output() openSetup = new EventEmitter<any>();
  @Output() roomRenamed = new EventEmitter<any>();
  @Output() setupClicked = new EventEmitter<any>();
  @Output() createSetup = new EventEmitter<{ x: number; y: number }>();

  @Output() itemOpen = new EventEmitter<any>();

  private rafId: number | null = null;

  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;
  ctxItem: any = null;

  ctxWorkspaceOpen = false;
  ctxWorkspaceX = 0;
  ctxWorkspaceY = 0;

  @ViewChild('dragBoundary', { static: true })
  boundaryEl!: ElementRef<HTMLElement>;

  elementRegistry = new Map<string, HTMLElement>();

  registerElement(e: { id: string; el: HTMLElement }) {
    this.elementRegistry.set(e.id, e.el);
    this.updateLines();
  }

  updateLines(): void {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.lineRefreshTrigger++;
      this.rafId = null;
    });
  }

  createSetupAtPosition(): void {
    this.createSetup.emit({
      x: this.ctxWorkspaceX,
      y: this.ctxWorkspaceY
    });

    this.ctxWorkspaceOpen = false;
  }

  onBackgroundRightClick(event: MouseEvent): void {
    event.preventDefault();

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxWorkspaceX = event.clientX - rect.left;
    this.ctxWorkspaceY = event.clientY - rect.top;

    this.ctxWorkspaceOpen = true;
    this.ctxOpen = false;
    this.ctxSetup = null;
    this.ctxItem = null;
  }

  onSetupRightClick(payload: any): void {
    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxSetup = payload.setup;
    this.ctxItem = null;

    this.ctxX = payload.x - rect.left;
    this.ctxY = payload.y - rect.top;

    this.ctxOpen = true;
    this.ctxWorkspaceOpen = false;
  }

  onItemRightClick(payload: any): void {
    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxItem = payload.item;
    this.ctxSetup = null;

    this.ctxX = payload.x - rect.left;
    this.ctxY = payload.y - rect.top;

    this.ctxOpen = true;
    this.ctxWorkspaceOpen = false;
  }

  closeContextMenu(): void {
    this.ctxOpen = false;
    this.ctxSetup = null;
    this.ctxItem = null;
  }

  onRoomDragEnded(setup: any, pos: any): void {
    this.roomMoved.emit({ setup, pos });
  }

  onSetupClick(setup: any): void {
    this.setupClicked.emit(setup);
  }

  openSetupDetails(setup: any): void {
    this.openSetup.emit(setup);
  }

  onRoomRenamed(data: any): void {
    this.roomRenamed.emit(data);
  }

  openItemDetails(item: any): void {
    this.itemOpen.emit(item);
  }

  onItemDragEnded(item: any, pos: { x: number; y: number }): void {
    const currentKey = this.getItemTrackKey(item, 0);

    this.items = this.items.map((it, index) => {
      const key = this.getItemTrackKey(it, index);

      if (key !== currentKey) {
        return it;
      }

      return {
        ...it,
        x: pos.x,
        y: pos.y
      };
    });

    this.updateLines();
  }

  getItemTrackKey(item: any, index: number): string {
    const source =
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      'unknown';

    const slot = item?.slot ?? 'noslot';

    const id =
      item?.id ??
      item?.part_id ??
      item?.item_id ??
      item?.product_id ??
      `${slot}-${index}`;

    return `${source}::${slot}::${id}::${index}`;
  }

  getItemDataId(item: any, index: number): string {
    return `item:${this.getItemTrackKey(item, index)}`;
  }

  getItemPosition(item: any, index: number): { x: number; y: number } {
    return {
      x: item?.x ?? 40 + (index % 4) * 210,
      y: item?.y ?? 40 + Math.floor(index / 4) * 110
    };
  }
}
