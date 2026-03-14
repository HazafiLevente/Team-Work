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
import { SetupRoomComponent } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupConnectionsComponent } from './connection-layer/setup-connections.component';
import { ContextMenuRoomComponent } from './context-menus/context-menu-room/context-menu-room.component';
import { ContextMenuBaseComponent } from './context-menus/context-menu-base/context-menu-base.component';
import { SetupWindowComponent } from './setup-windows/setup-window.component';

type WorkspaceWindow = {
  id: string;
  kind: 'connection';
  title: string;
  instanceNo: number;
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
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
    SetupWindowComponent
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

  @Output() openTools = new EventEmitter<void>();
  @Output() rename = new EventEmitter<any>();
  @Output() connect = new EventEmitter<void>();
  @Output() connections2 = new EventEmitter<void>();
  @Output() deleteSetup = new EventEmitter<any>();
  @Output() openConnections = new EventEmitter<void>();

  @Output() back = new EventEmitter<void>();
  @Output() roomMoved = new EventEmitter<{setup:any,pos:any}>();
  @Output() openSetup = new EventEmitter<any>();
  @Output() roomRenamed = new EventEmitter<any>();
  @Output() setupClicked = new EventEmitter<any>();
  @Output() createSetup = new EventEmitter<{x:number,y:number}>();

  private rafId: number | null = null;
  private nextZIndex = 7000;

  constructor(private http: HttpClient) {}

  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;
  ctxItem: any = null;

  ctxWorkspaceOpen = false;
  ctxWorkspaceX = 0;
  ctxWorkspaceY = 0;

  windows: WorkspaceWindow[] = [];

  @ViewChild('workspaceBoundary', { static: true })
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

  createSetupAtPosition() {
    this.createSetup.emit({
      x: this.ctxWorkspaceX,
      y: this.ctxWorkspaceY
    });

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

  onBackgroundRightClick(event: MouseEvent) {
    event.preventDefault();

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();

    this.ctxWorkspaceX = event.clientX - rect.left;
    this.ctxWorkspaceY = event.clientY - rect.top;

    this.ctxWorkspaceOpen = true;
  }

  onSetupRightClick(payload: any): void {
    this.ctxSetup = payload.setup;
    this.ctxItem = null;

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

  connectWindow(): void {
    const connectionCount =
      this.windows.filter(w => w.kind === 'connection').length + 1;

    const offset = (connectionCount - 1) * 28;

    const newWindow: WorkspaceWindow = {
      id: 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      kind: 'connection',
      title: 'Connection',
      instanceNo: connectionCount,
      x: 80 + offset,
      y: 80 + offset,
      zIndex: ++this.nextZIndex,
      minimized: false,
      maximized: false
    };

    this.closeContextMenu();
    this.windows = [...this.windows, newWindow];
  }

  closeWindow(id: string): void {
    this.windows = this.windows.filter(w => w.id !== id);
  }

  minimizeWindow(id: string): void {
    this.windows = this.windows.map(w =>
      w.id === id ? { ...w, minimized: true } : w
    );
  }

  restoreWindow(id: string): void {
    this.windows = this.windows.map(w =>
      w.id === id
        ? { ...w, minimized: false, zIndex: ++this.nextZIndex }
        : w
    );
  }

  focusWindow(id: string): void {
    this.windows = this.windows.map(w =>
      w.id === id ? { ...w, zIndex: ++this.nextZIndex } : w
    );
  }

  toggleMaximizeWindow(id: string): void {
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

  onRoomDragEnded(setup:any,pos:any){
    this.roomMoved.emit({setup,pos});
  }

  onSetupClick(setup:any){
    this.setupClicked.emit(setup);
  }

  openSetupDetails(setup:any){
    this.openSetup.emit(setup);
  }

  onRoomRenamed(data:any){
    this.roomRenamed.emit(data);
  }
}
