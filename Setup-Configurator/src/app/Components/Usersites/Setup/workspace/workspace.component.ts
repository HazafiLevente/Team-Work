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
import { HttpClient } from '@angular/common/http';

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
import { ContextMenuCategoryComponent } from './context-menus/context-menu-category/context-menu-category.component';

import { AddDeviceWindowComponent } from './setup-windows/add-device-window/add-device-window.component';
import {
  HomeTheaterBuilderComponent
} from '../setup-panel/home-theater-builder/ht-builder/home-theater-builder.component';
import { CarBuilderPanelComponent } from '../setup-panel/car-builder/car-builder-panel.component';

export type WorkspaceWindow = {
  id: string;
  title: string;
  kind: 'devices' | 'connections' | 'item-details' | 'pairing' | 'empty' | 'add-device';
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
    ContextMenuCategoryComponent,
    DotGridComponent,
    AddDeviceWindowComponent,
    HomeTheaterBuilderComponent,
    CarBuilderPanelComponent
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
  @Output() htSaved = new EventEmitter<void>();

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

  @ViewChild('workspaceRoot', { static: true })
  workspaceRoot!: ElementRef<HTMLElement>;

  isPanning = false;
  startX = 0;
  startY = 0;
  panX = 0;
  panY = 0;
  startPanX = 0;
  startPanY = 0;

  confirmDialogState: { isOpen: boolean; title: string; message: string; onConfirm: () => void } | null = null;
  
  constructor(private http: HttpClient) {}

  onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isBackground = target.classList.contains('setup-workspace') ||
      target.classList.contains('boundary-area') ||
      target.classList.contains('pan-wrapper') ||
      target.tagName.toLowerCase() === 'app-dot-grid';

    if (!isBackground) return;

    this.isPanning = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startPanX = this.panX;
    this.startPanY = this.panY;
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.isPanning = false;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;
      this.panX = this.startPanX + dx;
      this.panY = this.startPanY + dy;
    }

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

  @ViewChildren(SetupItemCardComponent)
  itemComponents!: QueryList<SetupItemCardComponent>;

  elementRegistry = new Map<string, HTMLElement>();

  registerElement(e: { id: string; el: HTMLElement }) {
    console.log(`📝 [Workspace] Registering element: ${e.id}`, !!e.el);
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
      this.ctxCategoryX = this.ctxWorkspaceX;
      this.ctxCategoryY = this.ctxWorkspaceY;
      this.ctxCategoryOpen = true;
      this.ctxWorkspaceOpen = false;
      this.ctxSetup = this.viewingSetup;
      return;
    }

    this.createSetup.emit(pos);
    this.ctxWorkspaceOpen = false;
  }

  openCategoryMenuForRoom(setup: any): void {
    this.ctxSetup = setup;
    this.ctxCategoryX = this.ctxX;
    this.ctxCategoryY = this.ctxY;
    this.ctxCategoryOpen = true;
    this.closeContextMenu();
  }

  onCategorySelected(category: string): void {
    const normalized = String(category || '').trim().toLowerCase();

    if (this.ctxSetup && (normalized === 'autók' || normalized === 'autok' || normalized === 'auto' || normalized === 'autó')) {
      this.openCarBuilderWindow(this.ctxSetup);
      this.ctxCategoryOpen = false;
      this.ctxSetup = null;
      return;
    }

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

    this.ctxWorkspaceX = event.clientX - rect.left - this.panX;
    this.ctxWorkspaceY = event.clientY - rect.top - this.panY;

    this.ctxWorkspaceOpen = true;
    this.ctxOpen = false;
    this.ctxSetup = null;
    this.ctxItem = null;
  }

  onSetupRightClick(payload: any): void {
    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxSetup = payload.setup;
    this.ctxItem = null;

    this.ctxX = payload.x - rect.left - this.panX;
    this.ctxY = payload.y - rect.top - this.panY;

    this.ctxOpen = true;
    this.ctxWorkspaceOpen = false;
  }

  onItemRightClick(payload: any): void {
    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxItem = payload.item;
    this.ctxSetup = null;

    this.ctxX = payload.x - rect.left - this.panX;
    this.ctxY = payload.y - rect.top - this.panY;

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

  private getContextItemKey(item: any): string {
    const source =
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      item?.category ??
      'unknown';

    const slot = item?.slot ?? 'noslot';

    const id =
      item?.id ??
      item?.part_id ??
      item?.item_id ??
      item?.product_id ??
      'unknown';

    return `${source}::${slot}::${id}`;
  }

  private getContextItemTableName(item: any): string {
    return (
      item?.category ??
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      ''
    );
  }

  startRenameForContextItem(): void {
    if (!this.ctxItem || !this.itemComponents) return;

    const targetKey = this.getContextItemKey(this.ctxItem);

    const itemComp = this.itemComponents.find(c => {
      const item = (c as any).item;
      const compKey = this.getContextItemKey(item);
      return compKey === targetKey;
    });

    (itemComp as any)?.startRename?.();
    this.closeContextMenu();
  }

  private tryDeleteContextItem(
    urls: string[],
    body: { itemId: any; tableName: string },
    onSuccess: () => void,
    index = 0
  ): void {
    if (index >= urls.length) {
      console.error('❌ Item törlés hiba: egyik endpoint sem működött.', urls);
      alert('Törlés sikertelen.');
      return;
    }

    const url = urls[index];

    this.http.request<any>('delete', url, {
      body,
      withCredentials: true
    }).subscribe({
      next: () => {
        onSuccess();
      },
      error: (err) => {
        const status = Number(err?.status ?? 0);

        if (status === 404) {
          console.warn(`⚠️ ${url} 404, következő delete fallback jön.`);
          this.tryDeleteContextItem(urls, body, onSuccess, index + 1);
          return;
        }

        console.error('❌ Item törlés hiba:', err);
        alert('Törlés sikertelen.');
      }
    });
  }

  deleteContextItem(): void {
    if (!this.ctxItem) return;

    const itemId = this.ctxItem?.id ?? this.ctxItem?.ID ?? this.ctxItem?.item_id;
    const tableName = this.getContextItemTableName(this.ctxItem);

    if (!itemId || !tableName) {
      console.error('❌ Hiányzó itemId vagy tableName törléshez:', this.ctxItem);
      return;
    }

    const displayName =
      this.ctxItem?.display_name ??
      this.ctxItem?.setup_name ??
      this.ctxItem?.name ??
      this.ctxItem?.model ??
      'Elem';

    this.confirmDialogState = {
      isOpen: true,
      title: 'Biztos törlöd?',
      message: displayName,
      onConfirm: () => {
        this.confirmDialogState = null;
        this.executeDeleteContextItem();
      }
    };
  }

  private executeDeleteContextItem(): void {
    if (!this.ctxItem) return;
    
    const itemId = this.ctxItem?.id ?? this.ctxItem?.ID ?? this.ctxItem?.item_id;
    const tableName = this.getContextItemTableName(this.ctxItem);
    
    const targetKey = this.getContextItemKey(this.ctxItem);
    const dataId = this.getItemDataId(this.ctxItem);

    this.tryDeleteContextItem(
      ['/api/setup/remove-item', '/api/remove-item'],
      { itemId, tableName },
      () => {
        this.items = this.items.filter(it => this.getContextItemKey(it) !== targetKey);
        this.elementRegistry.delete(dataId);
        this.closeContextMenu();
        this.updateLines();
      }
    );
  }

  private tryRenameContextItem(
    urls: string[],
    body: { itemId: any; tableName: string; newName: string },
    onSuccess: (updatedItem: any) => void,
    index = 0
  ): void {
    if (index >= urls.length) {
      console.error('❌ Item átnevezés hiba: egyik endpoint sem működött.', urls);
      alert('Átnevezés sikertelen.');
      return;
    }

    const url = urls[index];

    this.http.patch<any>(url, body, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        onSuccess(res?.item ?? null);
      },
      error: (err) => {
        const status = Number(err?.status ?? 0);

        if (status === 404) {
          console.warn(`⚠️ ${url} 404, következő rename fallback jön.`);
          this.tryRenameContextItem(urls, body, onSuccess, index + 1);
          return;
        }

        console.error('❌ Item átnevezés hiba:', err);
        alert('Átnevezés sikertelen.');
      }
    });
  }

  onItemRenamed(payload: any): void {
    const item = payload?.item;
    const newName = String(payload?.newName || '').trim();

    if (!item || !newName) return;

    const itemId = item?.id ?? item?.ID ?? item?.item_id;
    const tableName = this.getContextItemTableName(item);

    if (!itemId || !tableName) {
      console.error('❌ Hiányzó itemId vagy tableName átnevezéshez:', item);
      return;
    }

    const currentKey = this.getContextItemKey(item);

    this.tryRenameContextItem(
      ['/api/setup/rename-item', '/api/rename-item'],
      { itemId, tableName, newName },
      (updatedItem) => {
        this.items = this.items.map(it => {
          const same = this.getContextItemKey(it) === currentKey;
          if (!same) return it;

          if (updatedItem) {
            return {
              ...it,
              ...updatedItem,
              category: it?.category ?? updatedItem?.category ?? tableName
            };
          }

          return {
            ...it,
            display_name: newName
          };
        });

        this.updateLines();
      }
    );
  }

  openDevicesWindow(setup: any): void {
    const devicesCount = this.windows.filter(w => w.kind === 'devices').length + 1;
    const offset = (devicesCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'devices',
      title: 'Eszközök',
      payload: { setup },
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

  openAddDeviceWindow(setup: any): void {
    const count = this.windows.filter(w => w.kind === 'empty').length + 1;
    const offset = (count - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'empty',
      title: 'Házimozi',
      payload: { setup, startWithSidebarOpen: true },
      instanceNo: count,
      x: 60 + offset,
      y: 60 + offset,
      width: 1100,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  openEmptyWindow(title: string, setup: any, extraPayload: any = {}): void {
    const emptyCount = this.windows.filter(w => w.kind === 'empty').length + 1;
    const offset = (emptyCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'empty',
      title: title,
      payload: { setup, ...extraPayload },
      instanceNo: emptyCount,
      x: 100 + offset,
      y: 60 + offset,
      width: title === 'Házimozi' || title === 'Autók' ? 1100 : undefined,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  private openCarBuilderWindow(setup: any): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId ?? Date.now();
    const winId = 'car_builder_' + setupId;

    const existing = this.windows.find(w => w.id === winId);
    if (existing) {
      this.focusWindow(winId);
      return;
    }

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'empty',
      title: 'Autók',
      payload: { setup },
      instanceNo: this.windows.length + 1,
      x: 160,
      y: 90,
      width: 900,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  openConnectionsWindow(setup: any): void {
    const connCount = this.windows.filter(w => w.kind === 'connections').length + 1;
    const offset = (connCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'connections',
      title: 'Összekötések: ' + (setup.setup_name || ''),
      payload: { setup },
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
    const isTarget = pairingStage === 'PICK_TARGET_ITEM';
    const winId = isTarget ? 'pairing_target' : 'pairing_source';

    this.windows = this.windows.filter(w => w.id !== winId);

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'pairing',
      title: pairingStage === 'PICK_SOURCE' ? 'Forrás: ' + setup.setup_name : 'Cél: ' + setup.setup_name,
      payload: { setup, pairingStage, pairingItemList },
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
      const height = 500;

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

  onWindowClosed(id: string): void {
    const win = this.windows.find(w => w.id === id);
    if (win?.kind === 'pairing') {
      this.cancelConnectingEvent.emit();
    }
    this.closeWindow(id);
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

  onItemModify(item: any): void {
    this.closeContextMenu();
    if (!item) return;

    const isHT = String(item.setup_type || '').toLowerCase().includes('home_theater') ||
      String(item.category || '').toLowerCase().includes('home_theater');

    if (isHT) {
      this.openHtBuilderWindow(item);
    } else {
      console.log('Modify not supported for this item type:', item);
    }
  }

  private openHtBuilderWindow(item: any): void {
    const buildId = item.id || item.setup_id || item.ID;
    const winId = 'ht_builder_' + buildId;

    const existing = this.windows.find(w => w.id === winId);
    if (existing) {
      this.focusWindow(winId);
      return;
    }

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'empty',
      title: 'Házimozi',
      payload: { setup: this.viewingSetup, buildId: buildId },
      instanceNo: this.windows.length + 1,
      x: 150,
      y: 100,
      width: 900,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.windows = [...this.windows, newWindow];
  }

  onItemDragEnded(item: any, pos: { x: number; y: number }): void {
    const currentKey = this.getItemTrackKey(item, 0);
    const itemId = item?.id ?? item?.ID ?? item?.item_id;
    const tableName = item?.category ?? item?.source_table ?? item?.table_name ?? item?.table;

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

    const normalizedTable = String(tableName || '').toLowerCase();
    if (!itemId || (normalizedTable !== 'setups[setup]' && normalizedTable !== 'setup[setup]' && normalizedTable !== 'setup' && normalizedTable !== 'setups')) {
      return;
    }

    this.http.patch(
      '/api/setup/update-item-position',
      { itemId, tableName, x: pos.x, y: pos.y },
      { withCredentials: true }
    ).subscribe({
      error: (err) => {
        console.error('Item pozicio mentes hiba:', err);
      }
    });
  }

  getItemTrackKey(item: any, index: number): string {
    const source =
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      item?.category ??
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

  getItemDataId(item: any): string {
    const cat = String(item?.category || item?.source_table || item?.table_name || '')
      .toLowerCase()
      .replace('[setup]', '')
      .trim();
    const id = item?.id ?? item?.ID ?? item?.item_id;
    return `${cat}:${id}`;
  }

  getItemPosition(item: any, index: number): { x: number; y: number } {
    return {
      x: item?.x ?? 40 + (index % 4) * 210,
      y: item?.y ?? 40 + Math.floor(index / 4) * 110
    };
  }

  onHtSaved(): void {
    this.htSaved.emit();
  }
}
