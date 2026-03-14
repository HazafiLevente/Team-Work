import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ViewChildren,
  QueryList,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SetupRoomComponent } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupConnectionsComponent } from './connection-layer/setup-connections.component';
import { ContextMenuRoomComponent } from './context-menus/context-menu-room/context-menu-room.component';
import { ContextMenuBaseComponent } from './context-menus/context-menu-base/context-menu-base.component';
import { SetupWindowComponent } from './setup-windows/setup-window.component';
import { DevicesListComponent } from '../devices/devices-list/devices-list.component';
import {DevicesMenuComponent} from './setup-windows/devices-menu/devices-menu.component';

type WorkspaceWindowKind =
  | 'devices'
  | 'connections'
  | 'pc-builder'
  | 'custom'
  | 'item-details';

type WorkspaceWindow = {
  id: string;
  kind: WorkspaceWindowKind;
  title: string;
  instanceNo: number;
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  payload?: any;
};

@Component({
  selector: 'app-workspace',
  standalone: true,
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css'],
  imports: [
    CommonModule,
    SetupRoomComponent,
    DotGridComponent,
    SetupConnectionsComponent,
    ContextMenuRoomComponent,
    ContextMenuBaseComponent,
    SetupWindowComponent,
    DevicesListComponent,
    DevicesMenuComponent,
    DevicesListComponent
  ]
})
export class WorkspaceComponent {

  constructor(private http: HttpClient) {}

  @Input() lineRefreshTrigger = 0;
  @Input() connectMousePos: any = { x: 0, y: 0 };
  @Input() connectSourceSetup: any = null;
  @Input() pairingStage:
    | 'NONE'
    | 'PICK_SOURCE'
    | 'PICK_TARGET_SETUP'
    | 'PICK_TARGET_ITEM' = 'NONE';

  @Input() userSetups: any[] = [];
  @Input() items: any[] = [];
  @Input() connections: any[] = [];
  @Input() globalRoomConnections: any[] = [];
  @Input() viewingSetup: any = null;
  @Input() loading = false;
  @Input() loadingItems = false;

  @Output() rename = new EventEmitter<any>();
  @Output() deleteSetup = new EventEmitter<any>();
  @Output() openConnections = new EventEmitter<void>();

  @Output() back = new EventEmitter<void>();
  @Output() roomMoved = new EventEmitter<{ setup: any; pos: any }>();
  @Output() openSetup = new EventEmitter<any>();
  @Output() roomRenamed = new EventEmitter<any>();
  @Output() setupClicked = new EventEmitter<any>();
  @Output() createSetup = new EventEmitter<{ x: number; y: number }>();

  windows: WorkspaceWindow[] = [];
  private nextZIndex = 7000;

  openWindow(kind: WorkspaceWindowKind, title: string, payload?: any, x?: number, y?: number) {
    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind,
      title,
      instanceNo: 1,
      x: x ?? 200 + this.windows.length * 20,
      y: y ?? 120 + this.windows.length * 20,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false,
      payload
    };

    this.windows = [...this.windows, newWindow];
    return newWindow.id;
  }

  closeWindow(id: string) {
    this.windows = this.windows.filter(w => w.id !== id);
  }

  minimizeWindow(id: string) {
    this.windows = this.windows.map(w =>
      w.id === id ? { ...w, minimized: true } : w
    );
  }

  focusWindow(id: string) {
    this.windows = this.windows.map(w =>
      w.id === id ? { ...w, zIndex: ++this.nextZIndex } : w
    );
  }

  toggleMaximizeWindow(id: string) {
    this.windows = this.windows.map(w =>
      w.id === id
        ? {
          ...w,
          maximized: !w.maximized,
          minimized: false,
          zIndex: ++this.nextZIndex
        }
        : w
    );
  }

  private patchWindowPayload(id: string, patch: any) {
    this.windows = this.windows.map(w =>
      w.id === id
        ? { ...w, payload: { ...(w.payload || {}), ...patch } }
        : w
    );
  }

  openDevicesWindowFromMenu(): void {
    if (!this.ctxSetup) return;

    const setup = this.ctxSetup;
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;

    if (!setupId) return;

    this.closeContextMenu();

    this.http
      .get<any[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (devices) => {
          const newWindow: WorkspaceWindow = {
            id: 'devices_' + Date.now(),
            kind: 'devices',
            title: `Devices – ${setup?.setup_name ?? 'Setup'}`,
            instanceNo: 1,
            x: 200,
            y: 120,
            zIndex: ++this.nextZIndex,
            minimized: false,
            maximized: false,
            payload: {
              devices: Array.isArray(devices) ? devices : []
            }
          };

          this.windows = [...this.windows, newWindow];
        },
        error: (err) => {
          console.error('❌ Devices load error', err);
        }
      });
  }

  openItemDetailsWindow(item: any): void {
    const itemId = item?.id ?? item?.setup_id ?? item?.setupId;
    if (!itemId) return;

    const title = item?.display_name || item?.name || item?.setup_name || 'Részletek';
    const windowId = this.openWindow(
      'item-details',
      title,
      {
        loading: true,
        error: '',
        children: [],
        details: []
      },
      900,
      150
    );

    const detailsRequest = this.http
      .get<any>(`/api/setup/${itemId}`, { withCredentials: true })
      .pipe(
        catchError(() => of(item))
      );

    const childrenRequest = this.http
      .get<any[]>(`/api/setup/${itemId}/children`, { withCredentials: true })
      .pipe(
        catchError(() => of([]))
      );

    forkJoin({
      details: detailsRequest,
      children: childrenRequest
    }).subscribe({
      next: ({ details, children }) => {
        if (Array.isArray(children) && children.length > 0) {
          this.patchWindowPayload(windowId, {
            loading: false,
            children,
            details: [],
            error: ''
          });
          return;
        }

        this.resolveDetailEntries(details).subscribe((resolvedDetails) => {
          this.patchWindowPayload(windowId, {
            loading: false,
            children: [],
            details: resolvedDetails,
            error: ''
          });
        });
      },
      error: () => {
        this.patchWindowPayload(windowId, {
          loading: false,
          error: 'A részletek betöltése sikertelen.'
        });
      }
    });
  }

  private resolveDetailEntries(source: any) {
    const hiddenKeys = new Set([
      'x',
      'y',
      '__editing',
      'children',
      'items',
      'connections'
    ]);

    const keys = Object.keys(source || {})
      .filter(key => !hiddenKeys.has(key))
      .filter(key => source[key] !== null && source[key] !== undefined && source[key] !== '');

    const requests = keys.map((key) => {
      const value = source[key];

      if (key.endsWith('_id') && value) {
        return this.http.get<any>(`/api/setup/${value}`, { withCredentials: true }).pipe(
          map((resolved) => ({
            key: key.replace(/_id$/, ''),
            value: resolved?.display_name || resolved?.name || resolved?.setup_name || value
          })),
          catchError(() =>
            of({
              key,
              value
            })
          )
        );
      }

      return of({
        key,
        value
      });
    });

    if (!requests.length) {
      return of([]);
    }

    return forkJoin(requests);
  }

  connectWindow() {
    this.openWindow('connections', 'Connections', {});
    this.closeContextMenu();
  }

  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;
  ctxItem: any = null;

  ctxWorkspaceOpen = false;
  ctxWorkspaceX = 0;
  ctxWorkspaceY = 0;

  @ViewChild('workspaceBoundary', { static: true })
  boundaryEl!: ElementRef<HTMLElement>;

  @ViewChildren(SetupRoomComponent)
  roomComponents!: QueryList<SetupRoomComponent>;

  elementRegistry = new Map<string, HTMLElement>();

  registerElement(e: { id: string; el: HTMLElement }) {
    this.elementRegistry.set(e.id, e.el);
    this.updateLines();
  }

  private rafId: number | null = null;

  updateLines(): void {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.lineRefreshTrigger++;
      this.rafId = null;
    });
  }

  onBackgroundRightClick(event: MouseEvent) {
    event.preventDefault();

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxWorkspaceX = event.clientX - rect.left;
    this.ctxWorkspaceY = event.clientY - rect.top;

    this.ctxWorkspaceOpen = true;
  }

  onSetupRightClick(payload: any): void {
    this.ctxSetup = payload.setup;

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxX = payload.x - rect.left;
    this.ctxY = payload.y - rect.top;

    this.ctxOpen = true;
  }

  closeContextMenu(): void {
    this.ctxOpen = false;
    this.ctxSetup = null;
    this.ctxItem = null;
  }

  createSetupAtPosition() {
    this.createSetup.emit({
      x: this.ctxWorkspaceX,
      y: this.ctxWorkspaceY
    });

    this.ctxWorkspaceOpen = false;
  }

  onRoomDragEnded(setup: any, pos: any) {
    this.roomMoved.emit({ setup, pos });
  }

  onSetupClick(setup: any) {
    this.setupClicked.emit(setup);
  }

  openSetupDetails(setup: any) {
    this.openSetup.emit(setup);
  }

  onRoomRenamed(data: any) {
    this.roomRenamed.emit(data);
  }

  getDeviceType(item: any): string {
    const cat = String(item?.category || '').toLowerCase();

    if (cat.includes('pc')) return 'pc';
    if (cat.includes('switch')) return 'switch';
    if (cat.includes('router')) return 'router';
    if (cat.includes('modem')) return 'modem';
    if (cat.includes('home_theater')) return 'ht';
    if (cat.includes('setup')) return 'setup';

    return 'other';
  }

  trackByItem(index: number, item: any): any {
    return `${item?.category ?? 'x'}:${item?.id ?? index}`;
  }
}
