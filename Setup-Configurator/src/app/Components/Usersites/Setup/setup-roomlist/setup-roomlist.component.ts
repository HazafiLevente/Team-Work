import { Component, OnInit, HostListener, ViewChild, ElementRef, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SetupDockComponent } from '../dock/dock.component';
import { WorkspaceComponent } from '../workspace/workspace.component';
import { SetupConnectionsComponent } from '../workspace/connection-layer/setup-connections.component';
import { SetupCarDetailsPanelComponent } from '../quick-builder/setup-car-details-panel/setup-car-details-panel.component';
import { SetupPcDetailsPanelComponent } from '../quick-builder/setup-pc-details-panel/setup-pc-details-panel.component';
import { SetupPcPartDetailsPanelComponent } from '../quick-builder/setup-pc-part-details-panel/setup-pc-part-details-panel.component';
import { ProductDetailsPanelComponent } from '../../../Panels/Product/product-details-panel.component';

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
    ProductDetailsPanelComponent
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

  loading = false;
  loadingItems = false;

  private cachedBoundaryRect: DOMRect | null = null;
  private rafId: number | null = null;

  @ViewChild('boundary', { static: false })
  boundaryEl!: ElementRef<HTMLElement>;

  // context menu state
  ctxSetup: any = null;
  ctxPayload: any = null;

  // tools modal state
  toolsOpen = false;
  toolsSetup: any = null;
  toolsStartTab: 'items' | 'pc' | 'cars' = 'items';

  // overlay product panel
  selectedProduct: any = null;
  selectedCarItem: any = null;
  selectedPcItem: any = null;
  selectedPcPartItem: any = null;

  dockItems: { id: string; title: string }[] = [];

  constructor(private http: HttpClient) {}

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
          console.log('Pairing items:', res);
        },
        error: err => {
          console.error('❌ Pairing items loading error:', err);
        }
      });
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

    const viewingSetupType = String(this.viewingSetup?.setup_type ?? '').toLowerCase().trim();

    const isPcPart =
      !isFullPcSetup &&
      !isFullCarSetup &&
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
      this.selectedCarItem = item;
      return;
    }

    if (isFullPcSetup) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcPartItem = null;
      this.selectedPcItem = item;
      return;
    }

    if (isPcPart) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcItem = null;
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
  }

  openDockItem(item: any) {
    console.log('Dock item:', item);
  }

  openToolsFromMenu(): void {
    if (!this.ctxSetup) return;

    this.toolsStartTab = 'items';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;
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
    )
      .subscribe({
        next: (res) => {
          const created = res?.setup;
          if (!created) return;
          if (this.viewingSetup) return;
          this.userSetups = [created, ...this.userSetups];
        },
        error: (err) => {
          console.error('❌ Setup létrehozási hiba:', err);
        }
      });
  }

  deleteSetupFromMenu(setup: any): void {
    if (!setup) return;

    const setupId =
      setup?.id ??
      setup?.setup_id ??
      setup?.setupId;

    console.log('DELETE SETUP:', setup);

    if (!setupId) return;

    const name = this.getSetupTitle(setup);
    const ok = window.confirm(`Biztos törlöd?\n\n${name}`);
    if (!ok) return;

    this.http.delete<any>(`/api/setup/${setupId}`, { withCredentials: true })
      .subscribe({
        next: () => {
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
}
