import { Component, OnInit, HostListener, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { SetupRoomComponent, SetupRightClickPayload } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupToolsModalComponent } from '../setup-tools-modal/setup-tools-modal.component';
import { SetupCarDetailsPanelComponent } from '../setup-car-details-panel/setup-car-details-panel.component';
import { PcDrawerComponent } from '../pc-drawer/pc-drawer.component';

type SetupItem = any;

type PcPart = {
  id: number;
  slot: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' | 'other';
  source_table: string;
  display_name: string;
};

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    SetupRoomComponent,
    DotGridComponent,
    SetupToolsModalComponent,
    SetupCarDetailsPanelComponent,
    PcDrawerComponent
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {

  @Input() favoriteMode = false;
  @Input() allowCreate = true;

  // -------------------------
  // LISTA NÉZET (setup kártyák)
  // -------------------------
  userSetups: any[] = [];
  loading = true;

  // -------------------------
  // RÉSZLETEK NÉZET (setup elemei)
  // -------------------------
  viewingSetup: any = null;        // ha nem null -> details view
  loadingItems = false;
  items: SetupItem[] = [];
  itemsError = '';
  connections: any[] = [];
  allUserConnections: any[] = []; // ✅ ÚJ: Minden kapcsolat a főképernyőhöz
  globalRoomConnections: any[] = []; // ✅ Aggregált szobák közötti vonalak

  // ✅ Context menu state
  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxPayload: SetupRightClickPayload | null = null;
  ctxSetup: any = null;

  // ✅ Background context menu state
  bgCtxOpen = false;
  bgCtxX = 0;
  bgCtxY = 0;

  // ✅ Tools modal state
  toolsOpen = false;
  toolsSetup: any = null;
  toolsStartTab: 'items' | 'pc' | 'cars' = 'items';

  // ✅ Rename modal state
  renameOpen = false;
  renameSetup: any = null;
  renameValue = '';
  renameSaving = false;
  renameError = '';

  // ✅ Car draggable panel state
  carPanelOpen = false;
  carPanelItem: any = null;

  // ✅ PC Drawer state (NEW)
  pcDrawerOpen = false;
  pcDrawerPc: any = null;
  pcParts: PcPart[] = [];
  pcPartsLoading = false;
  pcPartsError = '';

  // ✅ CONNECTION MODE (NEW)
  pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';
  connectSourceItem: any = null;
  connectSourceSetup: any = null;
  connectTargetSetup: any = null;
  pairingItemList: any[] = [];
  connectMousePos = { x: 0, y: 0 };

  // ✅ CONNECTION MANAGEMENT (NEW)
  viewingConnsSetup: any = null;
  setupConnectionsList: any[] = [];
  loadingConns = false;

  // ✅ CONTEXT MENU (NEW)
  ctxItem: any = null;

  private elementRegistry = new Map<string, HTMLElement>();

  @ViewChild('boundary', { static: true }) boundaryEl!: ElementRef<HTMLElement>;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadUserSetups();
    this.loadGlobalConnections();
  }

  private buildListUrl(): string {
    const fav = this.favoriteMode ? 'true' : 'false';
    return `/api/setup?favorite=${fav}`;
  }

  loadUserSetups(): void {
    this.loading = true;

    this.http.get<any>(this.buildListUrl(), { withCredentials: true })
      .subscribe({
        next: res => {
          this.userSetups = res?.setups || [];
          this.loading = false;
          // Ha frissül a lista, frissítsük a globális vonalakat is
          this.processGlobalConnections();
        },
        error: err => {
          console.error('❌ Setup lista hiba:', err);
          this.userSetups = [];
          this.loading = false;
        }
      });
  }

  trackBySetup(index: number, setup: any): any {
    return setup?.id ?? setup?.setup_id ?? setup?.setupId ?? index;
  }

  getSetupTitle(s: any): string {
    return s?.setup_name ?? s?.name ?? 'Névtelen setup';
  }

  // ✅ items track
  trackByItem(index: number, it: any): any {
    return `${it?.category ?? 'x'}:${it?.id ?? index}`;
  }

  isNetworkSetup(s: any): boolean {
    return String(s?.isNetwork).toLowerCase() === 'true' || s?.isNetwork === true;
  }

  // -------------------------
  // ✅ ÚJ SETUP
  // -------------------------
  createNewSetup(customX?: number, customY?: number): void {
    if (!this.allowCreate) return;

    const setup_name = 'Új setup';

    this.http.post<any>(
      '/api/setup/create',
      {
        setup_name,
        x: customX ?? 50,
        y: customY ?? 50,
        isFavorite: this.favoriteMode
      },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const created = res?.setup;
        if (!created) return;

        if (this.viewingSetup) return; // detailben ne frissítsük a szobákat

        // Ha a favoriteMode be van kapcsolva, akkor is hozzáadjuk, ha esetleg filterelve van, de az UI-nek tudnia kell róla
        this.userSetups = [created, ...this.userSetups];
      },
      error: (err) => {
        console.error('❌ Setup létrehozási hiba:', err);
      }
    });
  }

  createNewSetupFromMenu(): void {
    const x = this.bgCtxX;
    const y = this.bgCtxY;
    this.createNewSetup(x, y);
    this.closeBackgroundContextMenu();
  }

  // -------------------------
  // ✅ DUPLA KATT -> DETAIL VIEW
  // -------------------------
  openSetupDetails(setup: any): void {
    if (this.pairingStage !== 'NONE') return;
    if (!setup) return;

    this.viewingSetup = setup;
    this.items = [];
    this.itemsError = '';
    this.loadingItems = true;

    // detail váltáskor zárjunk paneleket
    this.closeCarPanel();
    this.closePcDrawer();

    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) {
      this.loadingItems = false;
      this.itemsError = 'Hiányzó setup ID.';
      return;
    }

    this.http.get<any[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.items = Array.isArray(items) ? items : [];
          this.loadingItems = false;
          this.loadConnections(setupId);
        },
        error: (err) => {
          console.error('❌ children hiba:', err);
          this.items = [];
          this.loadingItems = false;
          this.itemsError = 'Betöltés sikertelen.';
        }
      });
  }

  // ✅ ÚJ: Összes kapcsolat lekérése (szobák közötti vonalakhoz)
  loadGlobalConnections(): void {
    this.http.get<any[]>('/api/setup/all-connections', { withCredentials: true })
      .subscribe({
        next: (conns) => {
          this.allUserConnections = Array.isArray(conns) ? conns : [];
          this.processGlobalConnections();
        },
        error: (err) => {
          console.error('❌ all-connections hiba:', err);
        }
      });
  }

  // ✅ ÚJ: Kapcsolatok csoportosítása szobák szerint ( Overview nézethez )
  processGlobalConnections(): void {
    if (!this.allUserConnections.length || !this.userSetups.length) {
      this.globalRoomConnections = [];
      return;
    }

    const aggregated = new Map<string, any>();

    this.allUserConnections.forEach(conn => {
      const sId = String(conn.from_setup_id);
      const tId = String(conn.to_setup_id);

      if (sId !== tId) {
        const key = [sId, tId].sort().join('-');
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            id: `global-${key}`,
            source: { category: 'setup[Setup]', id: sId },
            target: { category: 'setup[Setup]', id: tId }
          });
        }
      }
    });

    this.globalRoomConnections = Array.from(aggregated.values());
  }

  private connectionCache = new Map<string, any[]>();

  loadConnections(setupId: any): void {
    if (this.connectionCache.has(setupId)) {
      this.connections = this.connectionCache.get(setupId)!;
      return;
    }
    this.http.get<any[]>(`/api/setup/${setupId}/connections`, { withCredentials: true })
      .subscribe({
        next: (conns) => {
          this.connections = Array.isArray(conns) ? conns : [];
        },
        error: (err) => {
          console.error('❌ connections hiba:', err);
          this.connections = [];
        }
      });
  }

  lineRefreshTrigger = 0;
  private cachedBoundaryRect: DOMRect | null = null;
  private rafId: number | null = null;

  updateLines(): void {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      if (this.boundaryEl) {
        this.cachedBoundaryRect = this.boundaryEl.nativeElement.getBoundingClientRect();
      }
      this.lineRefreshTrigger++;
      this.rafId = null;
    });
  }

  registerElement(e: { id: string, el: HTMLElement }) {
    this.elementRegistry.set(e.id, e.el);
  }
  getLinePath(conn: any, _trigger?: any): string {

    const sId = `${conn.source.category}:${conn.source.id}`;
    const tId = `${conn.target.category}:${conn.target.id}`;

    const sEl = this.elementRegistry.get(sId);
    const tEl = this.elementRegistry.get(tId);

    if (!sEl) return '';

    // ✅ Használjuk a cache-elt rect-et vagy kérjük le ha nincs meg
    const rect = this.cachedBoundaryRect || this.boundaryEl.nativeElement.getBoundingClientRect();
    const sRect = sEl.getBoundingClientRect();

    const x1 = sRect.left + sRect.width / 2 - rect.left;
    const y1 = sRect.top + sRect.height / 2 - rect.top;

    if (!tEl) {
      const x2 = rect.width - 20;
      const y2 = y1;
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const tRect = tEl.getBoundingClientRect();
    const x2 = tRect.left + tRect.width / 2 - rect.left;
    const y2 = tRect.top + tRect.height / 2 - rect.top;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // ✅ Overview nézethez (szobák összekötése)
  getRoomLinePath(conn: any, _trigger?: any): string {
    const sId = `room:${conn.source.id}`;
    const tId = `room:${conn.target.id}`;

    const sEl = this.elementRegistry.get(sId);
    const tEl = this.elementRegistry.get(tId);

    if (!sEl || !tEl) return '';

    const rect = this.cachedBoundaryRect || this.boundaryEl.nativeElement.getBoundingClientRect();
    const sRect = sEl.getBoundingClientRect();
    const tRect = tEl.getBoundingClientRect();

    const x1 = sRect.left + sRect.width / 2 - rect.left;
    const y1 = sRect.top + sRect.height / 2 - rect.top;
    const x2 = tRect.left + tRect.width / 2 - rect.left;
    const y2 = tRect.top + tRect.height / 2 - rect.top;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }


  // ✅ ROOM (overview) Drag Ended
  onRoomDragEnded(setup: any, pos: { x: number, y: number }): void {
    const setupId = setup.id || setup.setup_id || setup.setupId;
    if (!setupId) return;

    // Frissítjük a lokális elhelyezkedést, hogy a vonalak is jól számoljanak
    setup.x = pos.x;
    setup.y = pos.y;

    this.updateLines();

    // Mentés a backendre
    this.http.patch(`/api/setup/rooms/${setupId}/position`, { x: pos.x, y: pos.y }, { withCredentials: true })
      .subscribe({
        next: () => {
          console.log(`✅ Room ${setupId} pozíció mentve:`, pos);
        },
        error: (err) => {
          console.error(`❌ Room ${setupId} pozíció mentés hiba:`, err);
        }
      });
  }

  // ✅ DETAIL nézet item dupla katt
  onItemDblClick(it: any): void {
    if (!it) return;

    const cat = String(it?.category ?? '');

    // ✅ CAR
    if (cat === 'Car_setup[Setup]') {
      this.closePcDrawer();     // ne legyen egyszerre nyitva
      this.openCarPanel(it);
      return;
    }

    // ✅ PC (pc_details[Setup])
    if (cat === 'pc_details[Setup]') {
      this.closeCarPanel();     // ne legyen egyszerre nyitva
      this.openPcDrawer(it);
      return;
    }

    // másra nem csinálunk semmit
  }

  // -------------------------
  // ✅ CAR PANEL
  // -------------------------
  openCarPanel(it: any): void {
    this.carPanelItem = it;
    this.carPanelOpen = true;
  }

  closeCarPanel(): void {
    this.carPanelOpen = false;
    this.carPanelItem = null;
  }

  // -------------------------
  // ✅ PC DRAWER (NEW)
  // -------------------------
  openPcDrawer(pcItem: any): void {
    this.pcDrawerPc = pcItem;
    this.pcDrawerOpen = true;
    this.loadPcParts();
  }

  closePcDrawer(): void {
    this.pcDrawerOpen = false;
    this.pcDrawerPc = null;
    this.pcParts = [];
    this.pcPartsLoading = false;
    this.pcPartsError = '';
  }

  private loadPcParts(): void {
    const setupId = this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId;
    if (!setupId) return;

    this.pcPartsLoading = true;
    this.pcPartsError = '';
    this.pcParts = [];

    this.http.get<any>(`/api/setup/${setupId}/pcparts`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const list = res?.parts;
          this.pcParts = Array.isArray(list) ? list : [];
          this.pcPartsLoading = false;
        },
        error: (err) => {
          console.error('❌ pcparts hiba:', err);
          this.pcParts = [];
          this.pcPartsLoading = false;
          this.pcPartsError = 'Alkatrészek betöltése sikertelen.';
        }
      });
  }

  // ✅ CONNECTION LOGIC (REFINED 2-STEP)
  startConnectingFromMenu(): void {
    if (!this.ctxSetup) return;
    this.connectSourceSetup = this.ctxSetup;
    this.pairingStage = 'PICK_SOURCE';
    this.closeContextMenu();
    this.loadPairingItems(this.connectSourceSetup.id || this.connectSourceSetup.setup_id);
  }

  startItemConnectingFromMenu(): void {
    if (!this.ctxItem || !this.viewingSetup) return;
    this.connectSourceSetup = this.viewingSetup;
    this.connectSourceItem = this.ctxItem;
    this.pairingStage = 'PICK_TARGET_SETUP';
    this.closeContextMenu();
  }

  cancelConnecting(): void {
    this.pairingStage = 'NONE';
    this.connectSourceItem = null;
    this.connectSourceSetup = null;
    this.connectTargetSetup = null;
    this.pairingItemList = [];
  }

  private loadPairingItems(setupId: any): void {
    this.http.get<any>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: res => {
          this.pairingItemList = res || [];
        },
        error: err => {
          console.error('❌ Pairing items loading error:', err);
          this.cancelConnecting();
        }
      });
  }

  selectSourceItem(item: any): void {
    this.connectSourceItem = item;
    this.pairingStage = 'PICK_TARGET_SETUP';
    this.pairingItemList = [];
    console.log('🔌 Source item picked. Select target setup.');
  }

  onSetupClick(setup: any): void {
    if (this.pairingStage === 'PICK_TARGET_SETUP') {
      this.selectTargetSetup(setup);
    }
  }

  selectTargetSetup(setup: any): void {
    if (this.pairingStage !== 'PICK_TARGET_SETUP') return;

    this.connectTargetSetup = setup;
    this.pairingStage = 'PICK_TARGET_ITEM';
    const setupId = setup.id || setup.setup_id;

    this.http.get<any>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: res => {
          this.pairingItemList = res || [];
          console.log('🔌 Target items loaded for setup:', setupId);
        },
        error: err => {
          console.error('❌ Target items loading error:', err);
          this.cancelConnecting();
        }
      });
  }

  finalizeConnection(targetItem: any): void {
    const sId = this.connectSourceItem.id || this.connectSourceItem.setup_id;
    const tId = targetItem.id || targetItem.setup_id;

    if (String(this.connectSourceItem.category) === String(targetItem.category) && String(sId) === String(tId)) {
      alert('Saját magával nem kötheted össze az eszközt.');
      this.cancelConnecting();
      return;
    }

    const payload = {
      from_setup_id: this.connectSourceSetup.id || this.connectSourceSetup.setup_id,
      to_setup_id: this.connectTargetSetup.id || this.connectTargetSetup.setup_id,
      from_device_type: this.getDeviceType(this.connectSourceItem),
      from_device_id: sId,
      to_device_type: this.getDeviceType(targetItem),
      to_device_id: tId,
      utp_id: 1
    };

    this.http.post('/api/setup/connections', payload, { withCredentials: true })
      .subscribe({
        next: () => {
          console.log('✅ Connection created');
          this.cancelConnecting();
          if (this.viewingSetup) this.loadConnections(this.viewingSetup.id);
          this.loadGlobalConnections();
        },
        error: (err) => {
          console.error('❌ Connection error:', err);
          alert('Hiba történt az összekötés során.');
          this.cancelConnecting();
        }
      });
  }

  // ✅ CONNECTION MANAGEMENT (NEW)
  openConnectionsFromMenu(): void {
    if (!this.ctxSetup) return;
    this.viewingConnsSetup = this.ctxSetup;
    const sId = this.viewingConnsSetup.id || this.viewingConnsSetup.setup_id;
    this.loadingConns = true;
    this.closeContextMenu();

    this.http.get<any[]>(`/api/setup/${sId}/connections`, { withCredentials: true })
      .subscribe({
        next: (conns) => {
          this.setupConnectionsList = conns || [];
          this.loadingConns = false;
        },
        error: (err) => {
          console.error('❌ Connections load error:', err);
          this.loadingConns = false;
          this.viewingConnsSetup = null;
        }
      });
  }

  closeConnections(): void {
    this.viewingConnsSetup = null;
    this.setupConnectionsList = [];
  }

  deleteConnection(id: number): void {
    if (!confirm('Biztosan törlöd ezt az összekötést?')) return;

    this.http.delete(`/api/setup/connections/${id}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.setupConnectionsList = this.setupConnectionsList.filter(c => c.id !== id);
          if (this.viewingSetup) this.loadConnections(this.viewingSetup.id);
          this.loadGlobalConnections();
        },
        error: (err) => {
          console.error('❌ Connection delete error:', err);
          alert('Hiba történt a törlés során.');
        }
      });
  }

  openItemConnectionsFromMenu(): void {
    if (!this.ctxItem || !this.viewingSetup) return;
    this.openConnectionsFromMenu();
  }

  public getDeviceType(item: any): string {
    const cat = String(item.category || '').toLowerCase();
    if (cat.includes('pc')) return 'pc';
    if (cat.includes('switch')) return 'switch';
    if (cat.includes('router')) return 'router';
    if (cat.includes('modem')) return 'modem';
    if (cat.includes('home_theater')) return 'ht';
    if (cat.includes('setup')) return 'setup';
    return 'other';
  }

  // ✅ Vissza gomb
  backToSetups(): void {
    this.viewingSetup = null;
    this.items = [];
    this.itemsError = '';
    this.loadingItems = false;
    this.connections = [];
    this.elementRegistry.clear();

    this.closeCarPanel();
    this.closePcDrawer();

    if (this.ctxOpen) this.closeContextMenu();
    if (this.bgCtxOpen) this.closeBackgroundContextMenu();
    if (this.toolsOpen) this.closeTools();
    if (this.renameOpen) this.closeRename();
  }

  // ✅ Jobb klikk menü pozíció
  // -------------------------
  onSetupRightClick(payload: SetupRightClickPayload): void {
    this.closeContextMenu(); // ✅ Előbb pucolás
    this.ctxSetup = payload.setup;
    this.ctxItem = null;
    this.openContextMenu(payload);
  }

  openContextMenu(payload: SetupRightClickPayload): void {
    this.ctxPayload = payload;

    const host = this.boundaryEl?.nativeElement;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const localX = payload.x - rect.left;
    const localY = payload.y - rect.top;

    const MENU_W = 260;
    const MENU_H = 360;
    const pad = 8;

    const maxX = Math.max(pad, rect.width - MENU_W - pad);
    const maxY = Math.max(pad, rect.height - MENU_H - pad);

    this.ctxX = Math.min(Math.max(localX, pad), maxX);
    this.ctxY = Math.min(Math.max(localY, pad), maxY);

    this.ctxOpen = true;
  }

  onItemRightClick(payload: SetupRightClickPayload): void {
    this.closeContextMenu(); // ✅ Előbb pucolás
    this.ctxItem = payload.setup; // payload.setup is the item here
    this.ctxSetup = null;
    this.openContextMenu(payload);
  }

  openItemDetailsFromMenu(): void {
    if (!this.ctxItem) return;
    this.onItemDblClick(this.ctxItem);
    this.closeContextMenu();
  }

  deleteItemFromMenu(): void {
    if (!this.ctxItem) return;
    const it = this.ctxItem;
    if (!confirm(`Biztosan törlöd ezt az eszközt: ${it.display_name}?`)) return;

    this.http.request('delete', '/api/setup/item', {
      body: { itemId: it.id, tableName: it.category },
      withCredentials: true
    })
      .subscribe({
        next: () => {
          this.items = this.items.filter(i => i.id !== it.id);
          this.closeContextMenu();
        },
        error: (err) => {
          console.error('❌ Item delete error:', err);
          alert('Hiba történt a törlés során.');
        }
      });
  }

  closeContextMenu(): void {
    this.ctxOpen = false;
    this.ctxSetup = null;
    this.ctxItem = null;
  }

  // ✅ Background context menu logic
  onBackgroundRightClick(e: MouseEvent): void {
    if (!this.allowCreate) return;

    // Ha szobára kattintottunk, ne a háttér menu jöjjön elő
    // (A szoba component már meghívta a stopPropagation-t a contextmenu eventre?
    // Nézzük meg a setup-room.component.ts-t!)

    e.preventDefault();

    const host = this.boundaryEl?.nativeElement;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    this.bgCtxX = localX;
    this.bgCtxY = localY;
    this.bgCtxOpen = true;

    // Ha a másik menu nyitva volt, zárjuk be
    if (this.ctxOpen) this.closeContextMenu();
  }

  closeBackgroundContextMenu(): void {
    this.bgCtxOpen = false;
  }

  // ✅ ESC
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.ctxOpen) this.closeContextMenu();
    if (this.bgCtxOpen) this.closeBackgroundContextMenu();
    if (this.toolsOpen) this.closeTools();
    if (this.renameOpen) this.closeRename();
    if (this.carPanelOpen) this.closeCarPanel();
    if (this.pcDrawerOpen) this.closePcDrawer();

    if (this.pairingStage !== 'NONE') {
      this.cancelConnecting();
      return;
    }

    if (this.viewingSetup) this.backToSetups();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.pairingStage === 'NONE' || this.pairingStage === 'PICK_SOURCE') return;

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();
    this.connectMousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  getGhostLinePath(): string {
    if (!this.connectSourceSetup) return '';
    const sid = 'room:' + (this.connectSourceSetup.id || this.connectSourceSetup.setup_id);
    const sourceEl = this.elementRegistry.get(sid);
    if (!sourceEl) return '';

    const rect = sourceEl.getBoundingClientRect();
    const parentRect = this.boundaryEl.nativeElement.getBoundingClientRect();

    const x1 = (rect.left + rect.width / 2) - parentRect.left;
    const y1 = (rect.top + rect.height / 2) - parentRect.top;
    const x2 = this.connectMousePos.x;
    const y2 = this.connectMousePos.y;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // ✅ Tools
  openToolsFromMenu(): void {
    if (!this.ctxSetup) return;

    this.toolsStartTab = 'items';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  openPcBuilderFromMenu(): void {
    if (!this.ctxSetup) return;
    if (this.isNetworkSetup(this.ctxSetup)) return;

    this.toolsStartTab = 'pc';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  openCarsFromMenu(): void {
    if (!this.ctxSetup) return;
    if (this.isNetworkSetup(this.ctxSetup)) return;

    this.toolsStartTab = 'cars';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  closeTools(): void {
    this.toolsOpen = false;
    this.toolsSetup = null;
    this.toolsStartTab = 'items';
  }

  // ✅ Rename

  openRenameFromMenu(): void {
    if (!this.ctxPayload) return;

    this.ctxPayload.component.startRename();
    this.closeContextMenu();
  }

  closeRename(): void {
    this.renameOpen = false;
    this.renameSetup = null;
    this.renameValue = '';
    this.renameSaving = false;
    this.renameError = '';
  }

  saveRename(): void {
    if (!this.renameSetup) return;

    const setupId =
      this.renameSetup?.id ??
      this.renameSetup?.setup_id ??
      this.renameSetup?.setupId;

    const name = (this.renameValue || '').trim();
    if (!name) {
      this.renameError = 'A név nem lehet üres.';
      return;
    }

    this.renameSaving = true;
    this.renameError = '';

    this.http.patch<any>(
      `/api/setup/${setupId}`,
      { setup_name: name },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const updated = res?.setup ?? { ...this.renameSetup, setup_name: name };
        const id = updated?.id ?? updated?.setup_id ?? updated?.setupId ?? setupId;

        this.userSetups = this.userSetups.map(s => {
          const sid = s?.id ?? s?.setup_id ?? s?.setupId;
          return String(sid) === String(id) ? { ...s, ...updated } : s;
        });

        if (this.viewingSetup) {
          const vid = this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId;
          if (String(vid) === String(id)) {
            this.viewingSetup = { ...this.viewingSetup, ...updated };
          }
        }

        this.renameSaving = false;
        this.closeRename();
      },
      error: (err) => {
        console.error('❌ Rename hiba:', err);
        this.renameError = 'Mentés sikertelen.';
        this.renameSaving = false;
      }
    });
  }

  onRoomRenamed(updated: any): void {
    if (!updated) return;

    const id = updated?.id ?? updated?.setup_id ?? updated?.setupId;

    // 1. Frissítjük a fő listát
    this.userSetups = this.userSetups.map(s => {
      const sid = s?.id ?? s?.setup_id ?? s?.setupId;
      return String(sid) === String(id) ? { ...s, ...updated } : s;
    });

    // 2. Frissítjük az items listát is (ha épp bent vagyunk)
    this.items = this.items.map(it => {
      const iid = it?.id ?? it?.setup_id ?? it?.setupId;
      return String(iid) === String(id) ? { ...it, ...updated } : it;
    });

    // 3. Frissítjük a viewingSetup-ot ha az lett átnevezve
    if (this.viewingSetup) {
      const vid = this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId;
      if (String(vid) === String(id)) {
        this.viewingSetup = { ...this.viewingSetup, ...updated };
      }
    }
  }

  // ✅ TÖRLÉS
  deleteSetupFromMenu(): void {
    if (!this.ctxSetup) return;

    const setupId =
      this.ctxSetup?.id ??
      this.ctxSetup?.setup_id ??
      this.ctxSetup?.setupId;

    if (!setupId) return;

    const name = this.getSetupTitle(this.ctxSetup);
    const ok = window.confirm(`Biztos törlöd?\n\n${name}`);
    if (!ok) return;

    this.http.delete<any>(`/api/setup/${setupId}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.userSetups = this.userSetups.filter(s => {
            const sid = s?.id ?? s?.setup_id ?? s?.setupId;
            return String(sid) !== String(setupId);
          });

          const vid = this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId;
          if (this.viewingSetup && String(vid) === String(setupId)) {
            this.backToSetups();
          }

          this.closeContextMenu();
        },
        error: (err) => {
          console.error('❌ Setup törlés hiba:', err);
          alert('Törlés sikertelen.');
        }
      });
  }
}
