import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ViewChildren,
  QueryList,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { SetupRoomComponent } from '../setup-room/setup-room.component';
import { SetupItemCardComponent } from '../setup-item-card/setup-item-card.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupConnectionsComponent } from './connection-layer/setup-connections.component';
import { ContextMenuRoomComponent } from './context-menus/context-menu-room/context-menu-room.component';
import { ContextMenuBaseComponent } from './context-menus/context-menu-base/context-menu-base.component';
import { ContextMenuItemComponent } from './context-menus/context-menu-item/context-menu-item.component';
import { SetupWindowComponent } from './setup-windows/setup-window.component';
import { SetupDockComponent } from '../dock/dock.component';
import { DevicesMenuComponent } from './setup-windows/devices-menu/devices-menu.component';
import { ConnectionsMenuComponent } from './setup-windows/connections-menu/connections-menu.component';
import { SetupPairingModalComponent } from '../setup-pairing-modal/setup-pairing-modal.component';
import { ContextMenuDockComponent } from './context-menus/context-menu-dock/context-menu-dock.component';
import { ContextMenuWorkspaceComponent } from './context-menus/context-menu-workspace/context-menu-workspace.component';
import { ContextMenuCategoryComponent } from './context-menus/context-menu-category/context-menu-category.component';
import { HomeTheaterBuilderComponent } from './setup-windows/quick-builder/home-theater-builder/home-theater-builder.component';

export type WorkspaceWindow = {
  id: string;
  title: string;
  kind: 'devices' | 'connections' | 'item-details' | 'pairing' | 'empty';
  payload?: any;
  instanceNo: number;
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  width?: number;
};

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
    ContextMenuItemComponent,
    SetupWindowComponent,
    DevicesMenuComponent,
    ConnectionsMenuComponent,
    SetupPairingModalComponent,
    SetupDockComponent,
    ContextMenuDockComponent,
    ContextMenuWorkspaceComponent,
    ContextMenuCategoryComponent,
    HomeTheaterBuilderComponent
  ]
})
export class WorkspaceComponent {
  @Input() lineRefreshTrigger = 0;
  @Input() connectMousePos: any = { x: 0, y: 0 };
  @Input() connectSourceSetup: any = null;
  @Input() connectTargetSetup: any = null;
  @Input() pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';

  @Input() userSetups: any[] = [];
  @Input() items: any[] = [];
  @Input() connections: any[] = [];
  @Input() globalRoomConnections: any[] = [];
  @Input() viewingSetup: any = null;
  @Input() loading = false;
  @Input() loadingItems = false;

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
  @Output() createItem = new EventEmitter<{ x: number; y: number }>();
  @Output() categorySelected = new EventEmitter<any>();

  @Output() cancelConnectingEvent = new EventEmitter<void>();
  @Output() selectSourceEvent = new EventEmitter<any>();
  @Output() finalizeConnectionEvent = new EventEmitter<any>();

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

  ctxCategoryOpen = false;
  ctxCategoryX = 0;
  ctxCategoryY = 0;

  ctxDockOpen = false;
  ctxDockX = 0;
  ctxDockY = 0;
  ctxDockWindow: WorkspaceWindow | null = null;

  windows: WorkspaceWindow[] = [];
  private nextZIndex = 10000;

  extWidth = 0;
  extHeight = 0;
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      if (this.pairingStage !== 'NONE' && this.boundaryEl) {
        const rect = this.boundaryEl.nativeElement.getBoundingClientRect();
        this.connectMousePos = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        this.updateLines();
      }
      this.rafId = null;
    });
  }

  @ViewChild('dragBoundary', { static: true })
  boundaryEl!: ElementRef<HTMLElement>;

  @ViewChildren(SetupRoomComponent)
  roomComponents!: QueryList<SetupRoomComponent>;

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
    const pos = {
      x: this.ctxWorkspaceX,
      y: this.ctxWorkspaceY
    };

    if (this.viewingSetup) {
      // If we are inside a setup, "New" means adding an item
      this.createItem.emit(pos);
      this.ctxWorkspaceOpen = false;
      return;
    }

    // Background right click in main workspace opens category menu
    this.ctxCategoryX = this.ctxWorkspaceX;
    this.ctxCategoryY = this.ctxWorkspaceY;
    this.ctxCategoryOpen = true;
    this.ctxWorkspaceOpen = false;
    this.ctxSetup = null; // Ensure we know it's a NEW setup being created
  }

  openCategoryMenuForRoom(setup: any): void {
    const setupObj = setup.setup || setup;
    this.ctxSetup = setupObj;

    // Use workspace context menu instead, as it now contains the categories
    this.ctxWorkspaceX = this.ctxX;
    this.ctxWorkspaceY = this.ctxY;
    this.ctxWorkspaceOpen = true;
    this.ctxOpen = false;
  }

  onCategorySelected(category: string): void {
    const pos = { x: this.ctxCategoryX, y: this.ctxCategoryY };
    this.categorySelected.emit({
      category,
      setup: this.ctxSetup,
      pos: !this.ctxSetup ? pos : undefined
    });
    this.ctxCategoryOpen = false;
    this.ctxSetup = null;
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
    this.ctxWorkspaceOpen = false;
    this.ctxCategoryOpen = false;
    this.ctxDockOpen = false;
    this.ctxDockWindow = null;
  }

  onDockItemRightClick(payload: { event: MouseEvent, window: any }): void {
    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();
    this.ctxDockWindow = payload.window;
    this.ctxDockX = payload.event.clientX - rect.left;
    this.ctxDockY = payload.event.clientY - rect.top;

    // Ensure menu doesn't go off bottom
    if (this.ctxDockY > rect.height - 150) {
      this.ctxDockY -= 150;
    }

    this.ctxDockOpen = true;
    this.ctxOpen = false;
    this.ctxWorkspaceOpen = false;
  }

  startRenameForContextSetup(): void {
    if (!this.ctxSetup || !this.roomComponents) return;

    const targetId =
      this.ctxSetup?.id ??
      this.ctxSetup?.setup_id ??
      this.ctxSetup?.setupId;

    const room = this.roomComponents.find(c => {
      const cid =
        c.setup?.id ??
        c.setup?.setup_id ??
        c.setup?.setupId;

      return String(cid) === String(targetId);
    });

    room?.startRename();
    this.closeContextMenu();
  }

  openDevicesWindow(setup: any): void {
    const setupObj = setup.setup || setup;
    const devicesCount = this.windows.filter(w => w.kind === 'devices').length + 1;
    const offset = (devicesCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'devices',
      title: 'Eszközök',
      payload: { setup: setupObj },
      instanceNo: devicesCount,
      x: 100 + offset,
      y: 100 + offset,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }


  onDeviceCategorySelected(category: string): void {
    const targetSetup = this.ctxSetup || this.viewingSetup;
    if (!targetSetup) return;

    switch (category) {
      case 'HT':
        this.openHTBuilder(targetSetup, true);
        break;
      case 'PC':
        this.openEmptyWindow('Számítógép', targetSetup);
        break;
      case 'AUTO':
        this.openEmptyWindow('Autó', targetSetup);
        break;
      case 'INST':
        this.openEmptyWindow('Hangszerek', targetSetup);
        break;
      case 'OTHER':
        this.openEmptyWindow('Egyéb', targetSetup);
        break;
    }
  }

  openHTBuilder(setup: any, isNew: boolean = false): void {
    const setupObj = setup.setup || setup;
    const windowId = 'ht-builder-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const w: WorkspaceWindow = {
      id: windowId,
      title: isNew ? 'Új Házimozi' : 'Házimozi',
      kind: 'empty',
      payload: {
        setup: setupObj,
        startWithSidebarOpen: true,
        isNewBuild: isNew
      },
      instanceNo: this.windows.length + 1,
      x: 50 + (this.windows.length * 30),
      y: 50 + (this.windows.length * 30),
      width: 1100,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.windows = [...this.windows, w];
    this.calculateWorkspaceExtension();
  }


  openEmptyWindow(title: string, setup: any): void {
    const setupObj = setup.setup || setup;
    const emptyCount = this.windows.filter(w => w.kind === 'empty').length + 1;
    const offset = (emptyCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'empty',
      title: title,
      payload: { setup: setupObj },
      instanceNo: emptyCount,
      x: 100 + offset,
      y: 60 + offset,
      width: title === 'Házimozi' ? 1100 : undefined,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  openConnectionsWindow(setup: any): void {
    const setupObj = setup.setup || setup;
    const connCount = this.windows.filter(w => w.kind === 'connections').length + 1;
    const offset = (connCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'connections',
      title: 'Összekötések: ' + (setupObj.setup_name || ''),
      payload: { setup: setupObj },
      instanceNo: connCount,
      x: 100 + offset,
      y: 100 + offset,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  openPairingWindow(setup: any, pairingStage: string, pairingItemList: any[]): void {
    const setupObj = setup.setup || setup;
    const isTarget = pairingStage === 'PICK_TARGET_ITEM';
    const winId = isTarget ? 'pairing_target' : 'pairing_source';

    // Remove any existing window with the same ID (to avoid duplicates if they re-click same setup)
    this.windows = this.windows.filter(w => w.id !== winId);

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'pairing',
      title: pairingStage === 'PICK_SOURCE' ? 'Forrás: ' + setupObj.setup_name : 'Cél: ' + setupObj.setup_name,
      payload: { setup: setupObj, pairingStage, pairingItemList },
      instanceNo: isTarget ? 2 : 1,
      x: isTarget ? 450 : 100,
      y: 100,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.windows = [...this.windows, newWindow];
  }

  closePairingWindows(): void {
    this.windows = this.windows.filter(w => w.kind !== 'pairing');
  }

  updateWindowPosition(id: string, pos: { x: number, y: number }): void {
    const idx = this.windows.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.windows[idx].x = pos.x;
      this.windows[idx].y = pos.y;
      this.calculateWorkspaceExtension();
    }
  }

  private calculateWorkspaceExtension(): void {
    if (!this.boundaryEl) return;

    let maxX = 0;
    let maxY = 0;

    this.windows.forEach(w => {
      if (w.minimized) return;
      const width = w.width || 420;
      const height = 500; // Estimated

      const right = w.x + width;
      const bottom = w.y + height;

      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();
    const margin = 100;

    this.extWidth = maxX > rect.width ? maxX + margin : 0;
    this.extHeight = maxY > rect.height ? maxY + margin : 0;

    this.updateLines();
  }

  closeWindow(id: string): void {
    this.windows = this.windows.filter(w => w.id !== id);
  }

  minimizeWindow(id: string): void {
    this.windows = this.windows.map(w => w.id === id ? { ...w, minimized: true } : w);
  }

  restoreWindow(id: string): void {
    this.windows = this.windows.map(w => w.id === id ? { ...w, minimized: false, zIndex: ++this.nextZIndex } : w);
  }

  focusWindow(id: string): void {
    this.windows = this.windows.map(w => w.id === id ? { ...w, zIndex: ++this.nextZIndex } : w);
  }

  toggleMaximizeWindow(id: string): void {
    this.windows = this.windows.map(w => w.id === id ? { ...w, maximized: !w.maximized, minimized: false, zIndex: ++this.nextZIndex } : w);
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
