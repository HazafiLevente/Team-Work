import { Component, OnInit, HostListener, ViewChild, ElementRef, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SetupDockComponent } from '../dock/dock.component';
import { WorkspaceComponent } from '../workspace/workspace.component';
import { SetupConnectionsComponent } from '../workspace/connection-layer/setup-connections.component';
import { SetupCarDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-car-details-panel/setup-car-details-panel.component';
import { SetupPcDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-pc-details-panel/setup-pc-details-panel.component';
import { SetupPcPartDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-pc-part-details-panel/setup-pc-part-details-panel.component';
import { ProductDetailsPanelComponent } from '../../../Panels/Product/product-details-panel.component';
import { SetupHtDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-ht-details-panel/setup-ht-details-panel.component';
import { SetupPairingModalComponent } from '../setup-pairing-modal/setup-pairing-modal.component';

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
    SetupDockComponent,
    WorkspaceComponent,
    SetupConnectionsComponent,
    SetupCarDetailsPanelComponent,
    SetupPcDetailsPanelComponent,
    SetupPcPartDetailsPanelComponent,
    ProductDetailsPanelComponent,
    SetupHtDetailsPanelComponent,
    SetupPairingModalComponent
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit, AfterViewInit {

  ngOnInit(): void {
    this.loadUserSetups();
    this.loadGlobalConnections();
  }

  ngAfterViewInit() {
    setTimeout(() => this.updateLines(), 100);
  }

  @Input() favoriteMode = false;
  @Input() allowCreate = true;

  userSetups: any[] = [];
  items: any[] = [];
  allUserConnections: any[] = [];
  viewingSetup: any = null;

  @Input() connections: any[] = [];
  @Input() globalRoomConnections: any[] = [];

  lineRefreshTrigger = 0;
  @Input() elementRegistry!: Map<string, HTMLElement>;
  @Input() boundary!: HTMLElement;
  @Input() connectMousePos: any;
  @Input() connectSourceSetup: any;
  @Input() pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';

  connectSourceItem: any = null;
  connectTargetSetup: any = null;
  pairingItemList: any[] = [];

  loading = false;
  loadingItems = false;

  private cachedBoundaryRect: DOMRect | null = null;
  private rafId: number | null = null;

  @ViewChild('boundary', { static: false })
  boundaryEl!: ElementRef<HTMLElement>;

  @ViewChild(WorkspaceComponent)
  workspaceComp!: WorkspaceComponent;

  // context menu state
  ctxSetup: any = null;
  ctxPayload: any = null;

  // overlay product panel
  selectedProduct: any = null;
  selectedCarItem: any = null;
  selectedPcItem: any = null;
  selectedPcPartItem: any = null;
  selectedHtItem: any = null;
  private isBusy = false;

  dockItems: { id: string; title: string }[] = [];

  constructor(private http: HttpClient) { }

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
          this.processGlobalConnections();
        },
        error: err => {
          console.error('❌ Setup lista hiba:', err);
          this.userSetups = [];
          this.loading = false;
        }
      });
  }

  getSetupTitle(s: any): string {
    return s?.setup_name ?? s?.name ?? 'Névtelen setup';
  }

  loadPairingItems(setupId: any): void {
    this.http.get<any>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: res => {
          this.pairingItemList = res || [];
          if (this.workspaceComp) {
            const setupObj = this.pairingStage === 'PICK_SOURCE' ? this.connectSourceSetup : this.connectTargetSetup;
            this.workspaceComp.openPairingWindow(setupObj, this.pairingStage, this.pairingItemList);
          }
        },
        error: err => {
          console.error('❌ Pairing items loading error:', err);
          this.cancelConnecting();
        }
      });
  }

  cancelConnecting(): void {
    this.pairingStage = 'NONE';
    this.connectSourceItem = null;
    this.connectSourceSetup = null;
    this.connectTargetSetup = null;
    this.pairingItemList = [];
    if (this.workspaceComp) {
      this.workspaceComp.closePairingWindows();
    }
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
          if (this.workspaceComp) {
            this.workspaceComp.openPairingWindow(this.connectTargetSetup, this.pairingStage, this.pairingItemList);
          }
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
          // ToDo: load connections propertly for details view if needed
          this.loadGlobalConnections();
        },
        error: (err) => {
          console.error('❌ Connection error:', err);
          alert('Hiba történt az összekötés során.');
          this.cancelConnecting();
        }
      });
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

  loadGlobalConnections(): void {
    this.http.get<any[]>('/api/setup/all-connections', { withCredentials: true })
      .subscribe({
        next: conns => {
          console.log('🔥 RAW CONNECTIONS FROM API:', conns);
          this.allUserConnections = conns || [];
          this.processGlobalConnections();
        },
        error: err => {
          console.error('❌ all connections hiba:', err);
        }
      });
  }

  updateLines(): void {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.lineRefreshTrigger++;
      this.rafId = null;
    });
  }

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

    console.log('🔥 GLOBAL ROOM CONNECTIONS:', this.globalRoomConnections);

    this.updateLines();
  }

  private normalizeLoadedItem(item: any, index: number): any {
    const sourceTable =
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      (typeof item?.category === 'string'
        ? item.category.replace(/\[setup\]/gi, '').trim()
        : '');

    const displayName =
      item?.display_name ??
      item?.product_name ??
      item?.setup_name ??
      item?.name ??
      item?.model ??
      item?.title ??
      `${item?.slot ?? 'Elem'} #${index + 1}`;

    return {
      ...item,
      part_id: item?.part_id ?? item?.id,
      table_name: sourceTable,
      source_table: sourceTable,
      display_name: displayName,
      x: item?.x ?? 40 + (index % 4) * 210,
      y: item?.y ?? 40 + Math.floor(index / 4) * 110
    };
  }

  private loadSetupChildrenFallback(setupId: any): void {
    this.http.get<any[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          const arr = Array.isArray(items) ? items : [];
          this.items = arr.map((item, index) => this.normalizeLoadedItem(item, index));
          this.loadingItems = false;
          this.updateLines();
        },
        error: (err) => {
          console.error('❌ children hiba:', err);
          this.items = [];
          this.loadingItems = false;
        }
      });
  }

  openSetupDetails(setup: any): void {
    if (!setup) return;

    this.viewingSetup = setup;
    this.items = [];
    this.selectedProduct = null;
    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;
    this.loadingItems = true;

    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) {
      this.loadingItems = false;
      return;
    }

    const setupType = String(setup?.setup_type ?? '').toLowerCase().trim();

    // PC setupnál először próbáljuk a pcparts endpointot
    if (setupType === 'pc') {
      this.http.get<any>(`/api/setup/${setupId}/pcparts`, { withCredentials: true })
        .subscribe({
          next: (res) => {
            const rawParts = Array.isArray(res) ? res : (Array.isArray(res?.parts) ? res.parts : []);
            this.items = rawParts.map((part: any, index: number) => this.normalizeLoadedItem(part, index));
            this.loadingItems = false;
            this.updateLines();
          },
          error: (err) => {
            console.warn('⚠️ pcparts endpoint hiba, fallback children-re:', err);
            this.loadSetupChildrenFallback(setupId);
          }
        });

      return;
    }

    // egyéb setupoknál marad a children
    this.loadSetupChildrenFallback(setupId);
  }

  openItemOverlay(item: any): void {
    if (!item) return;

    const rawTable = String(
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      item?.category ??
      ''
    ).trim();

    const normalizedTable = rawTable.toLowerCase().replace(/\s+/g, '_');
    const viewingSetupType = String(this.viewingSetup?.setup_type ?? '').toLowerCase().trim();

    const isFullPcSetup =
      item?.processor_id != null ||
      item?.videocard_id != null ||
      item?.motherboard_id != null ||
      item?.ram_id != null ||
      item?.psu_id != null;

    const isFullCarSetup =
      item?.brand != null ||
      item?.body_type != null ||
      item?.fuel != null ||
      item?.year != null ||
      normalizedTable.includes('car_setup') ||
      normalizedTable.includes('car[setup]') ||
      normalizedTable.includes('carsetup');

    const isFullHtSetup =
      viewingSetupType === 'home theater' ||
      viewingSetupType === 'home_theater' ||
      viewingSetupType === 'hometheater' ||
      normalizedTable.includes('home_theater_setups') ||
      normalizedTable.includes('home theater') ||
      normalizedTable.includes('hometheater');

    const isPcPart =
      !isFullPcSetup &&
      !isFullCarSetup &&
      !isFullHtSetup &&
      (
        !!item?.slot ||
        viewingSetupType === 'pc' ||
        normalizedTable.includes('pc_details') ||
        normalizedTable.includes('pc-details') ||
        normalizedTable.includes('processor') ||
        normalizedTable.includes('videocard') ||
        normalizedTable.includes('motherboard') ||
        normalizedTable.includes('ram') ||
        normalizedTable.includes('psu')
      );

    if (isFullCarSetup) {
      this.selectedProduct = null;
      this.selectedPcItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedCarItem = item;
      return;
    }

    if (isFullPcSetup) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedPcItem = item;
      return;
    }

    if (isFullHtSetup) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = item;
      return;
    }

    if (isPcPart) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcItem = null;
      this.selectedHtItem = null;
      this.selectedPcPartItem = item;
      return;
    }

    const table =
      item?.source_table ??
      item?.table_name ??
      item?.table ??
      '';

    const id =
      item?.part_id ??
      item?.item_id ??
      item?.product_id ??
      item?.id ??
      null;

    if (!table || id == null) {
      console.error('❌ Hiányzó table/id overlay megnyitáshoz:', item);
      return;
    }

    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;
    this.selectedProduct = {
      id,
      table,
      table_name: table,
      manufacturer: item?.manufacturer ?? '',
      model: item?.display_name ?? item?.name ?? item?.model ?? 'Eszköz',
      data: {
        id,
        table,
        table_name: table,
        manufacturer: item?.manufacturer ?? '',
        model: item?.display_name ?? item?.name ?? item?.model ?? 'Eszköz'
      }
    };
  }

  closeProductOverlay(): void {
    this.selectedProduct = null;
    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;
  }

  onRoomDragEnded(setup: any, pos: { x: number; y: number }): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) return;

    setup.x = pos.x;
    setup.y = pos.y;

    this.userSetups = this.userSetups.map(s => {
      const sid = s?.id ?? s?.setup_id ?? s?.setupId;
      return String(sid) === String(setupId)
        ? { ...s, x: pos.x, y: pos.y }
        : s;
    });

    this.http.patch(`/api/setup/rooms/${setupId}/position`, { x: pos.x, y: pos.y }, { withCredentials: true })
      .subscribe({
        next: () => {
          console.log(`✅ Room ${setupId} pozíció mentve`, pos);
        },
        error: (err) => {
          console.error('❌ pozíció mentés hiba:', err);
        }
      });
  }

  backToSetups() {
    this.viewingSetup = null;
    this.items = [];
    this.selectedProduct = null;
    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;
  }

  openDockItem(item: any) {
    console.log('Dock item:', item);
  }

  startConnectingFromMenu(setup: any): void {
    if (!setup) return;

    this.connectSourceSetup = setup;
    this.pairingStage = 'PICK_SOURCE';

    const setupId =
      setup.id ||
      setup.setup_id;

    this.loadPairingItems(setupId);
  }

  createNewSetup(customX?: number, customY?: number): void {
    if (!this.allowCreate) return;
    this.handleCategorySelected({
      category: 'Számítógép', // Default name
      pos: { x: customX ?? 50, y: customY ?? 50 }
    });
  }

  deleteSetupFromMenu(setup: any): void {
    if (!setup || this.isBusy) return;

    const setupId =
      setup?.id ??
      setup?.setup_id ??
      setup?.setupId;

    console.log('DELETE SETUP:', setup);

    if (!setupId) return;

    const name = this.getSetupTitle(setup);
    const ok = window.confirm(`Biztos törlöd?\n\n${name}`);
    if (!ok) return;

    this.isBusy = true;
    this.http.delete<any>(`/api/setup/${setupId}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.isBusy = false;
          this.userSetups = this.userSetups.filter(s => {
            const sid = s?.id ?? s?.setup_id ?? s?.setupId;
            return String(sid) !== String(setupId);
          });

          const vid =
            this.viewingSetup?.id ??
            this.viewingSetup?.setup_id ??
            this.viewingSetup?.setupId;

          if (this.viewingSetup && String(vid) === String(setupId)) {
            this.backToSetups();
          }
        },
        error: (err) => {
          this.isBusy = false;
          console.error('❌ Setup törlés hiba:', err);
          alert('Törlés sikertelen.');
        }
      });
  }

  openRenameFromMenu(setup: any): void {
    if (!setup) return;

    const id = setup.id ?? setup.setup_id ?? setup.setupId;

    setTimeout(() => {
      const el = document.querySelector(`[data-id="room:${id}"]`);
      if (!el) return;

      const comp = (el as any).__ngContext__?.[8];
      comp?.startRename?.();
    });
  }

  saveRenamedRoom(data: any): void {
    if (!data) return;

    const setupId =
      data?.id ??
      data?.setup_id ??
      data?.setupId;

    const newName =
      data?.setup_name ??
      data?.display_name ??
      data?.name;

    if (!setupId || !newName) return;

    this.http.patch<any>(
      `/api/setup/${setupId}`,
      { setup_name: newName },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const updated = res?.setup ?? { ...data, setup_name: newName };

        this.userSetups = this.userSetups.map(s => {
          const sid = s?.id ?? s?.setup_id ?? s?.setupId;
          return String(sid) === String(setupId)
            ? { ...s, ...updated, display_name: updated.setup_name }
            : s;
        });

        if (this.viewingSetup) {
          const vid =
            this.viewingSetup?.id ??
            this.viewingSetup?.setup_id ??
            this.viewingSetup?.setupId;

          if (String(vid) === String(setupId)) {
            this.viewingSetup = {
              ...this.viewingSetup,
              ...updated,
              display_name: updated.setup_name
            };
          }
        }
      },
      error: (err) => {
        console.error('❌ Setup átnevezés hiba:', err);
        alert('Átnevezés sikertelen.');
      }
    });
  }

  openDevicesWindowForCurrentSetup(pos?: { x: number, y: number }): void {
    if (this.viewingSetup && this.workspaceComp) {
      this.workspaceComp.closeContextMenu();
      this.workspaceComp.openDevicesWindow(this.viewingSetup);
    }
  }

  handleCategorySelected(event: any): void {
    if (!event) return;

    // Support both direct string and object payloads
    const category = typeof event === 'string' ? event : event.category;
    const setup = event.setup;
    const pos = event.pos;

    const catName = String(category || '').trim();
    const catNorm = catName.toLowerCase()
      .replace(/\u0151/g, 'o').replace(/\u0171/g, 'u').replace(/\u00e1/g, 'a')
      .replace(/\u00e9/g, 'e').replace(/\u00ed/g, 'i').replace(/\u00f3/g, 'o')
      .replace(/\u00f6/g, 'o').replace(/\u00fa/g, 'u').replace(/\u00fc/g, 'u');

    let type: string;
    if (catName === 'Házimozi' || catNorm.includes('hazimozi') || catNorm.includes('hazi')) {
      type = 'home_theater';
    } else if (catName === 'Számítógép' || catNorm.includes('szamitogep') || catNorm.includes('szam')) {
      type = 'pc';
    } else if (catName === 'Autók' || catNorm.includes('autok') || catNorm.includes('auto')) {
      type = 'car';
    } else {
      type = 'other';
    }

    console.log(`🔧 Category: "${catName}" → Type: "${type}"`);

    if (setup) {
      // Transformation
      const setupId = setup.id || setup.setup_id || setup.setupId;
      this.http.patch<any>(`/api/setup/${setupId}`, {
        setup_type: type,
        setup_name: catName
      }, { withCredentials: true })
        .subscribe({
          next: (res) => {
            const updated = res.setup || { ...setup, setup_type: type, setup_name: catName };
            this.userSetups = this.userSetups.map(s => {
              const sid = s.id || s.setup_id || s.setupId;
              return String(sid) === String(setupId) ? { ...s, ...updated } : s;
            });
            console.log('✅ Setup transformed to:', type);
            if (type === 'home_theater') {
              this.openEmptyWindowForCategory('Házimozi', updated);
            }
          },
          error: (err) => console.error('❌ Setup type update hiba:', err)
        });
    } else if (pos) {
      // Creation
      this.http.post<any>('/api/setup/create', {
        setup_name: catName || 'Új Setup',
        x: pos.x,
        y: pos.y,
        setup_type: type,
        isFavorite: this.favoriteMode
      }, { withCredentials: true }).subscribe({
        next: (res) => {
          if (res.setup) {
            this.userSetups = [res.setup, ...this.userSetups];
            console.log('✅ Setup created at:', pos);
            if (type === 'home_theater') {
              setTimeout(() => this.openEmptyWindowForCategory('Házimozi', res.setup), 100);
            }
          }
        },
        error: (err) => console.error('❌ Setup creation hiba:', err)
      });
    }
  }

  openEmptyWindowForCategory(title: any, setup?: any): void {
    // FORCE title to be a string
    let finalTitle = 'Setup';
    if (typeof title === 'string') {
      finalTitle = title;
    } else if (title && typeof title === 'object' && title.category) {
      finalTitle = String(title.category);
    } else if (title) {
      finalTitle = String(title);
    }

    const target = setup || this.viewingSetup;

    if (this.workspaceComp) {
      this.workspaceComp.closeContextMenu();
      this.workspaceComp.openEmptyWindow(finalTitle, target);
    }
  }
}
