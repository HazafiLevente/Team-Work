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
import { InstrumentBuilderPanelComponent } from '../setup-panel/instrument-builder/instrument-builder-panel.component';
import { PcBuilderPanelComponent } from '../setup-panel/pc-builder/pc-builder-panel.component';
import { NetworkBuilderPanelComponent } from '../setup-panel/network-builder/network-builder-panel.component';


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
  height?: number | null;
  snapMode?: 'left' | 'right' | null;
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
    HomeTheaterBuilderComponent,
    CarBuilderPanelComponent,
    InstrumentBuilderPanelComponent,
    PcBuilderPanelComponent,
    NetworkBuilderPanelComponent,
  ]
})
export class WorkspaceComponent {
  @Input() lineRefreshTrigger = 0;
  @Input() connectMousePos: any = { x: 0, y: 0 };
  @Input() connectSourceSetup: any = null;
  @Input() connectSourceItem: any = null;
  @Input() connectTargetSetup: any = null;
  @Input() pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';
  @Input() allowPcHtLinks = false;
  @Input() pairingConnections: any[] = [];

  @Input() userSetups: any[] = [];
  @Input() items: any[] = [];
  @Input() connections: any[] = [];
  @Input() globalRoomConnections: any[] = [];
  @Input() viewingSetup: any = null;
  @Input() hideDock = false;
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
  @Output() backgroundClicked = new EventEmitter<void>();
  @Output() createSetup = new EventEmitter<{ x: number; y: number }>();
  @Output() createItem = new EventEmitter<{ x: number; y: number }>();
  @Output() categorySelected = new EventEmitter<any>();

  @Output() cancelConnectingEvent = new EventEmitter<void>();
  @Output() selectSourceEvent = new EventEmitter<any>();
  @Output() finalizeConnectionEvent = new EventEmitter<any>();
  @Output() allowPcHtLinksChange = new EventEmitter<boolean>();

  @Output() itemOpen = new EventEmitter<any>();
  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemConnect = new EventEmitter<any>();
  @Output() htSaved = new EventEmitter<void>();

  private rafId: number | null = null;

  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;
  ctxItem: any = null;
  pendingDeleteItem: any = null;
  pendingDeleteSetup: any = null;

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

  snapAssistWindowId: string | null = null;
  snapAssistVisible = false;
  private readonly snapAssistThreshold = 18;

  extWidth = 0;
  extHeight = 1100;

  @ViewChild('workspaceRoot', { static: true })
  workspaceRoot!: ElementRef<HTMLElement>;

  isPanning = false;
  startX = 0;
  startY = 0;
  panX = 0;
  panY = 0;
  startPanX = 0;
  startPanY = 0;

  confirmDialogState: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
  } | null = null;

  constructor(private http: HttpClient) {}

  onMouseDown(event: MouseEvent): void {
    return;

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
    this.elementRegistry.set(e.id, e.el);
    this.updateLines();
  }

  noteSetups(): any[] {
    return (this.userSetups || []).filter((setup) => this.isNoteSetup(setup));
  }

  isNoteSetup(setup: any): boolean {
    return setup?.isNote === true || setup?.is_note === true || setup?.isnote === true;
  }

  noteName(setup: any): string {
    return String(setup?.display_name ?? setup?.setup_name ?? setup?.name ?? 'Jegyzet');
  }

  noteBookmarkLabel(setup: any, index: number): string {
    const name = this.noteName(setup).trim();
    return name ? name.slice(0, 1).toUpperCase() : String(index + 1);
  }

  noteTrackKey(index: number, setup: any): any {
    return setup?.id ?? setup?.setup_id ?? setup?.setupId ?? index;
  }

  openNoteBookmark(setup: any, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.openDevicesWindow(setup);
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

    if (this.ctxSetup && (normalized === 'hangszer' || normalized === 'hangszerek' || normalized === 'instrument' || normalized === 'instruments')) {
      this.openInstrumentBuilderWindow(this.ctxSetup);
      this.ctxCategoryOpen = false;
      this.ctxSetup = null;
      return;
    }

    if (this.ctxSetup && (normalized === 'hálózat' || normalized === 'halozat' || normalized === 'network' || normalized === 'modem' || normalized === 'router' || normalized === 'switch')) {
      this.openNetworkBuilderWindow(this.ctxSetup);
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

  onBackgroundClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const interactive = target.closest(
      '.drag-element, app-setup-room, app-setup-item-card, app-setup-window, app-setup-dock, app-context-menu-base, button, input, select, textarea'
    );
    if (interactive) return;

    this.closeContextMenu();
    this.backgroundClicked.emit();
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
    const dockItem = payload.event.currentTarget as HTMLElement | null;
    const dockItemRect = dockItem?.getBoundingClientRect();

    this.ctxDockWindow = payload.window;
    this.ctxDockX = dockItemRect
      ? dockItemRect.left - rect.left + (dockItemRect.width / 2) - 122
      : payload.event.clientX - rect.left;
    this.ctxDockY = dockItemRect
      ? dockItemRect.top - rect.top + 14
      : payload.event.clientY - rect.top;

    this.ctxDockOpen = true;
    this.ctxOpen = false;
    this.ctxWorkspaceOpen = false;
  }

  startRenameForContextSetup(): void {
    this.startRenameForSetup(this.ctxSetup);
    this.closeContextMenu();
  }

  startRenameForSetup(setup: any): void {
    if (!setup || !this.roomComponents) return;

    const targetId =
      setup?.id ??
      setup?.setup_id ??
      setup?.setupId;

    const room = this.roomComponents.find(c => {
      const cid =
        c.setup?.id ??
        c.setup?.setup_id ??
        c.setup?.setupId;

      return String(cid) === String(targetId);
    });

    room?.startRename();
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
    if (this.isSetupRoomContext(this.viewingSetup)) return 'setups';
    if (item?.room_id != null) return 'setups';
    if (item?.setup_id != null && item?.device_id != null) return 'setup_devices';

    return (
      item?.category ??
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      ''
    );
  }

  private isSetupRoomContext(setup: any): boolean {
    return !!setup && setup?.room_id == null;
  }

  startRenameForContextItem(): void {
    this.startRenameForItem(this.ctxItem);
    this.closeContextMenu();
  }

  startRenameForItem(item: any): void {
    if (!item || !this.itemComponents) return;

    const targetKey = this.getContextItemKey(item);

    const itemComp = this.itemComponents.find(c => {
      const item = (c as any).item;
      const compKey = this.getContextItemKey(item);
      return compKey === targetKey;
    });

    (itemComp as any)?.startRename?.();
  }

  private tryDeleteContextItem(
    urls: string[],
    body: { itemId: any; tableName: string; setupId?: any },
    onSuccess: () => void,
    index = 0
  ): void {
    if (index >= urls.length) {
      console.error('❌ Item törlés hiba: egyik endpoint sem működött.', urls);
      this.showDeleteError('Torles sikertelen.');
      return;
    }

    const url = urls[index];
    const deleteUrl = body.tableName === 'setups'
      ? `/api/setup/remove-child-setup/${body.itemId}`
      : url;
    const deleteBody = body.tableName === 'setups'
      ? { roomId: body.setupId }
      : body;


    const request = body.tableName === 'setups'
      ? this.http.request<any>('delete', deleteUrl, {
          body: deleteBody,
          withCredentials: true
        })
      : this.http.request<any>('delete', deleteUrl, {
          body: deleteBody,
          withCredentials: true
        });

    request.subscribe({
      next: (res) => {
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
        this.showDeleteError(err?.error?.error || 'Torles sikertelen.');
      }
    });
  }

  private showDeleteError(message: string): void {
    this.confirmDialogState = {
      isOpen: true,
      title: 'Torles sikertelen',
      message,
      confirmText: 'Rendben',
      hideCancel: true,
      onConfirm: () => {
        this.confirmDialogState = null;
      }
    };
  }

  deleteContextItem(): void {
    const item = this.ctxItem;
    const setup = this.viewingSetup;

    console.error('[workspace] context delete clicked', {
      ctxItem: item,
      viewingSetup: setup
    });

    if (!item) {
      console.error('[workspace] context delete stopped: missing ctxItem');
      return;
    }

    const itemId = item?.id ?? item?.ID ?? item?.item_id;
    const tableName = this.getContextItemTableName(item);

    if (!itemId || !tableName) {
      console.error('[workspace] context delete stopped: missing itemId or tableName', {
        itemId,
        tableName,
        ctxItem: item
      });
      console.error('❌ Hiányzó itemId vagy tableName törléshez:', this.ctxItem);
      return;
    }

    const displayName =
      item?.display_name ??
      item?.setup_name ??
      item?.name ??
      item?.model ??
      'Elem';

    this.pendingDeleteItem = { ...item };
    this.pendingDeleteSetup = setup ? { ...setup } : null;

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
    const item = this.pendingDeleteItem;
    const setup = this.pendingDeleteSetup ?? this.viewingSetup;

    if (!item) {
      console.error('[workspace] execute delete stopped: missing pendingDeleteItem');
      return;
    }

    const itemId = item?.id ?? item?.ID ?? item?.item_id;
    const tableName = this.getContextItemTableName(item);
    const setupId = item?.setup_id ?? item?.room_id ?? setup?.id ?? setup?.setup_id;

    const targetKey = this.getContextItemKey(item);
    const dataId = this.getItemDataId(item);

    this.tryDeleteContextItem(
      ['/api/setup/remove-item', '/api/remove-item'],
      { itemId, tableName, setupId },
      () => {
        this.items = this.items.filter(it => this.getContextItemKey(it) !== targetKey);
        this.elementRegistry.delete(dataId);
        this.pendingDeleteItem = null;
        this.pendingDeleteSetup = null;
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
    const isNote = setup?.isNote === true || setup?.is_note === true || setup?.isnote === true;
    const setupName = setup?.setup_name ?? setup?.display_name ?? setup?.name ?? 'Jegyzet';
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId ?? setupName;
    const winId = `${isNote ? 'note' : 'devices'}_${setupId}`;
    const existing = this.windows.find(w => w.id === winId);

    if (existing) {
      this.windows = this.windows.map(w => w.id === winId ? { ...w, minimized: false, zIndex: ++this.nextZIndex } : w);
      this.closeContextMenu();
      return;
    }

    const devicesCount = this.windows.filter(w => w.kind === 'devices').length + 1;
    const offset = (devicesCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'devices',
      payload: { setup },
      title: isNote ? `Jegyzet: ${setupName}` : 'Eszkozok',
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

  openPcBuilderWindow(setup: any): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId ?? Date.now();
    const winId = 'pc_builder_' + setupId;

    const existing = this.windows.find(w => w.id === winId);
    if (existing) {
      this.focusWindow(winId);
      return;
    }

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'empty',
      title: 'Szamitogep',
      payload: { setup },
      instanceNo: this.windows.length + 1,
      x: 140,
      y: 70,
      width: 1100,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  openCarBuilderWindow(setup: any): void {
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

  openInstrumentBuilderWindow(setup: any): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId ?? Date.now();
    const winId = 'instrument_builder_' + setupId;

    const existing = this.windows.find(w => w.id === winId);
    if (existing) {
      this.focusWindow(winId);
      return;
    }

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'empty',
      title: 'Hangszerek',
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

  openNetworkBuilderWindow(setup: any): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId ?? Date.now();
    const winId = 'network_builder_' + setupId;

    const existing = this.windows.find(w => w.id === winId);
    if (existing) {
      this.focusWindow(winId);
      return;
    }

    const newWindow: WorkspaceWindow = {
      id: winId,
      kind: 'empty',
      title: 'Halozat',
      payload: { setup },
      instanceNo: this.windows.length + 1,
      x: 180,
      y: 110,
      width: 760,
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
      this.windows[idx].snapMode = null;
      this.windows[idx].height = null;
      this.calculateWorkspaceExtension();
    }
  }

  resizeWindow(id: string, size: { width: number, height: number, x: number, y: number }): void {
    const idx = this.windows.findIndex(w => w.id === id);
    if (idx === -1) return;

    this.windows[idx] = {
      ...this.windows[idx],
      x: size.x,
      y: size.y,
      width: size.width,
      height: size.height,
      maximized: false,
      snapMode: null
    };

    this.calculateWorkspaceExtension();
  }

  onWindowDragMoved(id: string, pos: { x: number, y: number }): void {
    if (pos.y <= this.snapAssistThreshold) {
      this.snapAssistWindowId = id;
      this.snapAssistVisible = true;
      return;
    }

    if (this.snapAssistWindowId === id) {
      this.snapAssistVisible = false;
      this.snapAssistWindowId = null;
    }
  }

  onWindowDragEnded(id: string, pos: { x: number, y: number }): void {
    this.updateWindowPosition(id, pos);

    if (pos.y <= this.snapAssistThreshold) {
      this.snapAssistWindowId = id;
      this.snapAssistVisible = true;
    }
  }

  closeSnapAssist(): void {
    this.snapAssistVisible = false;
    this.snapAssistWindowId = null;
  }

  applySnapLayout(mode: 'max' | 'left' | 'right'): void {
    const id = this.snapAssistWindowId;
    const boundary = this.boundaryEl?.nativeElement;
    if (!id || !boundary) return;

    const width = boundary.clientWidth;
    const height = boundary.clientHeight;
    const halfWidth = Math.max(420, Math.floor(width / 2));

    this.windows = this.windows.map(w => {
      if (w.id !== id) return w;

      if (mode === 'max') {
        return {
          ...w,
          x: 0,
          y: 0,
          width: undefined,
          height: null,
          snapMode: null,
          maximized: true,
          minimized: false,
          zIndex: ++this.nextZIndex
        };
      }

      return {
        ...w,
        x: mode === 'left' ? 0 : Math.max(0, width - halfWidth),
        y: 0,
        width: halfWidth,
        height,
        snapMode: mode,
        maximized: false,
        minimized: false,
        zIndex: ++this.nextZIndex
      };
    });

    this.closeSnapAssist();
    this.calculateWorkspaceExtension();
  }

  private calculateWorkspaceExtension(): void {
    if (!this.boundaryEl) return;

    const defaultWorkspaceHeight = 1100;
    let maxX = 0;
    let maxY = defaultWorkspaceHeight;

    this.windows.forEach(w => {
      if (w.minimized) return;
      const width = w.width || 420;
      const height = this.getEstimatedWindowHeight(w);

      const right = w.x + width;
      const bottom = w.y + height;

      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();
    const margin = 100;

    this.extWidth = maxX > rect.width ? maxX + margin : 0;
    this.extHeight = Math.max(defaultWorkspaceHeight, rect.height, maxY + margin);

    this.updateLines();
  }

  private getEstimatedWindowHeight(window: WorkspaceWindow): number {
    if (window.kind === 'pairing') return 560;
    if (window.kind === 'devices' || window.kind === 'connections') return 560;

    const title = String(window.title || '').toLowerCase();
    if (title.includes('szamitogep')) return 780;
    if (title.includes('házimozi') || title.includes('hazimozi')) return 720;
    if (title.includes('aut') || title.includes('hangszer')) return 700;

    return 560;
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
    if (this.snapAssistWindowId === id) {
      this.closeSnapAssist();
    }
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
    this.windows = this.windows.map(w => w.id === id ? { ...w, maximized: !w.maximized, minimized: false, snapMode: null, height: null, zIndex: ++this.nextZIndex } : w);
    this.closeSnapAssist();
  }

  onRoomDragEnded(setup: any, pos: any): void {
    this.roomMoved.emit({ setup, pos });
  }

  onSetupClick(setup: any): void {
    this.setupClicked.emit(setup);
  }

  onItemClick(item: any): void {
    this.itemClicked.emit(item);
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

    const setupType = String(item.setup_type ?? item.type ?? item.category ?? '').toLowerCase();
    const childId = Number(item?.id ?? item?.setup_id ?? item?.ID ?? 0) || null;
    const productId = Number(item?.product_id ?? item?.device_id ?? item?.productId ?? 0) || null;

    const isHT =
      setupType.includes('home_theater') ||
      setupType === 'ht';
    const isPc =
      setupType.includes('pc') ||
      setupType.includes('laptop') ||
      setupType.includes('all_in_one') ||
      setupType.includes('computer');
    const isCar = setupType.includes('car');
    const isInstrument = setupType.includes('instrument') || setupType.includes('inst') || setupType.includes('hangszer');
    const isNetwork = setupType.includes('router') || setupType.includes('switch') || setupType.includes('modem') || setupType.includes('network');

    if (isHT) {
      this.openHtBuilderWindow(item);
      return;
    }

    // Builders expect the parent room setup in [setup]. We keep the same child setup id via editChildSetupId.
    const extraPayload: any = {
      editChildSetupId: childId,
      initialProductId: productId,
      initialPcSetup: item
    };

    if (isPc) {
      this.openEmptyWindow('Szamitogep', this.viewingSetup, extraPayload);
      return;
    }
    if (isCar) {
      this.openEmptyWindow('Autók', this.viewingSetup, extraPayload);
      return;
    }
    if (isInstrument) {
      this.openEmptyWindow('Hangszerek', this.viewingSetup, extraPayload);
      return;
    }
    if (isNetwork) {
      const t = String(item?.setup_type ?? item?.type ?? item?.role ?? item?.category ?? '').toLowerCase();
      const inferred =
        t.includes('switch') ? 'switch' :
        t.includes('modem') ? 'modem' :
        t.includes('router') ? 'router' :
        null;
      extraPayload.initialNetworkType = inferred;
      // Some list items don't carry product_id yet; resolve it from get-children by id.
      if (!extraPayload.initialProductId && childId && this.viewingSetup) {
        const roomId = Number(this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId ?? 0) || null;
        if (roomId) {
          this.http.get<any>(`/api/setup/${roomId}/get-children`, { withCredentials: true }).subscribe({
            next: (res) => {
              const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
              const found = list.find((x: any) => Number(x?.id ?? x?.ID ?? 0) === Number(childId));
              const pid = Number(found?.product_id ?? found?.device_id ?? found?.productId ?? 0) || null;
              this.openEmptyWindow('Halozat', this.viewingSetup, { ...extraPayload, initialProductId: pid });
            },
            error: () => {
              this.openEmptyWindow('Halozat', this.viewingSetup, extraPayload);
            }
          });
          return;
        }
      }

      this.openEmptyWindow('Halozat', this.viewingSetup, extraPayload);
      return;
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

  private getConnectionCategoryForItem(item: any): string {
    const setupType = [
      item?.setup_type,
      item?.type,
      item?.device_type,
      item?.category,
      item?.source_table,
      item?.table_name,
      item?.table,
      item?.slot,
      item?.display_name,
      item?.setup_name,
      item?.name,
      item?.model
    ].map((value) => String(value || '').toLowerCase().replace('[setup]', '').replace(/[\s-]+/g, '_').trim()).filter(Boolean).join(' ');

    if (!setupType || setupType === 'room') return 'setup';
    if (setupType.includes('pc')) return 'pc';
    if (setupType.includes('network_card')) return 'network_card';
    if (setupType.includes('network_adapter')) return 'network_card';
    if (setupType.includes('ethernet_adapter')) return 'network_card';
    if (setupType.includes('wifi_adapter')) return 'network_card';
    if (setupType.includes('wi_fi_adapter')) return 'network_card';
    if (setupType.includes('switch')) return 'switch';
    if (setupType.includes('router')) return 'router';
    if (setupType.includes('modem')) return 'modem';
    if (setupType.includes('home_theater') || setupType === 'ht') return 'ht';
    if (setupType.includes('audio_processor') || setupType === 'audiop') return 'audiop';
    if (setupType.includes('mixer')) return 'mixer';
    if (setupType.includes('car')) return 'car';

    return setupType;
  }

  getItemDataId(item: any): string {
    const cat = this.getConnectionCategoryForItem(item);
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
