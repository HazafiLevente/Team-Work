import {
  Component,
  OnInit,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
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
import { PcBuilderPanelComponent } from '../setup-panel/pc-builder/pc-builder-panel.component';

type PairingStage = 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM';

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
    SetupPairingModalComponent,
    PcBuilderPanelComponent
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit, AfterViewInit {
  @Input() favoriteMode = false;
  @Input() allowCreate = true;

  @Output() openCategoryPicker = new EventEmitter<any>();

  @ViewChild(WorkspaceComponent) workspaceComp?: WorkspaceComponent;

  userSetups: any[] = [];
  items: any[] = [];

  connections: any[] = [];
  globalRoomConnections: any[] = [];

  selectedProduct: any = null;
  selectedCarItem: any = null;
  selectedPcItem: any = null;
  selectedPcPartItem: any = null;
  selectedHtItem: any = null;
  viewingSetup: any = null;

  loading = false;
  loadingItems = false;
  lineRefreshTrigger = 0;
  connectMousePos: { x: number; y: number } | null = null;

  connectSourceSetup: any = null;
  connectSourceItem: any = null;
  connectTargetSetup: any = null;
  pairingItems: any[] = [];
  pairingTargetItems: any[] = [];
  pairingConnections: any[] = [];
  pairingStage: PairingStage = 'NONE';

  dragging = false;
  isBusy = false;

  pcBuilderOpen = false;
  pcBuilderSetup: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSetups();
    this.loadGlobalConnections();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateLines(), 100);
  }

  private getSetupId(setup: any): number | null {
    const id = setup?.id ?? setup?.setup_id ?? setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private getItemId(item: any): number | null {
    const id = item?.id ?? item?.ID ?? null;
    return id == null ? null : Number(id);
  }

  private normalizeSetup(setup: any): any {
    return {
      ...setup,
      setup_name: setup?.setup_name ?? setup?.name ?? 'Névtelen setup'
    };
  }

  loadSetups(): void {
    const fav = this.favoriteMode ? 'true' : 'false';
    this.loading = true;

    this.http.get<any>(`/api/setup?favorite=${fav}`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.userSetups = Array.isArray(res?.setups)
          ? res.setups.map((s: any) => this.normalizeSetup(s))
          : [];
        this.loading = false;
        this.updateLines();
      },
      error: (err) => {
        console.error('❌ Setup list hiba:', err);
        this.userSetups = [];
        this.loading = false;
      }
    });
  }

  loadGlobalConnections(): void {
    this.http.get<any[]>(`/api/setup/all-connections`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.globalRoomConnections = Array.isArray(res) ? res : [];
        this.updateLines();
      },
      error: (err) => {
        console.error('❌ Global connections hiba:', err);
        this.globalRoomConnections = [];
      }
    });
  }

  updateLines(): void {
    this.lineRefreshTrigger++;
  }

  getSetupTitle(setup: any): string {
    return setup?.setup_name ?? setup?.display_name ?? setup?.name ?? 'Setup';
  }

  onSetupClick(setup: any): void {
    if (!setup) return;
    this.openSetupDetails(setup);
  }

  onSetupDetails(setup: any): void {
    this.openSetupDetails(setup);
  }

  openSetupDetails(setup: any): void {
    if (!setup) return;

    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    this.viewingSetup = this.normalizeSetup(setup);
    this.selectedProduct = null;
    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;

    this.loadingItems = true;

    this.http.get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true }).subscribe({
      next: (children) => {
        this.items = Array.isArray(children) ? children : [];
        this.loadConnections(setupId);
      },
      error: (err) => {
        console.error('❌ Setup children hiba:', err);
        this.items = [];
        this.connections = [];
        this.loadingItems = false;
      }
    });
  }

  loadConnections(setupId: number | string): void {
    this.http.get<any[]>(`/api/setup/${setupId}/get-connections`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.connections = Array.isArray(res) ? res : [];
        this.loadingItems = false;
        this.updateLines();
      },
      error: (err) => {
        console.error('❌ Setup connections hiba:', err);
        this.connections = [];
        this.loadingItems = false;
      }
    });
  }

  loadPairingItems(setupId: number | string): void {
    this.http.get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.pairingItems = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.error('❌ Pairing source items hiba:', err);
        this.pairingItems = [];
      }
    });
  }

  loadTargetPairingItems(setupId: number | string): void {
    this.http.get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.pairingTargetItems = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.error('❌ Pairing target items hiba:', err);
        this.pairingTargetItems = [];
      }
    });
  }

  loadPairingConnections(): void {
    const sourceSetupId = this.getSetupId(this.connectSourceSetup);
    if (!sourceSetupId) return;

    this.http.get<any[]>(`/api/setup/${sourceSetupId}/get-connections`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.pairingConnections = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.error('❌ Pairing connections hiba:', err);
        this.pairingConnections = [];
      }
    });
  }

  cancelConnecting(): void {
    this.connectSourceSetup = null;
    this.connectSourceItem = null;
    this.connectTargetSetup = null;
    this.pairingItems = [];
    this.pairingTargetItems = [];
    this.pairingConnections = [];
    this.pairingStage = 'NONE';
  }

  startConnectingFromMenu(setup: any): void {
    if (!setup) return;

    this.connectSourceSetup = setup;
    this.connectSourceItem = null;
    this.connectTargetSetup = null;
    this.pairingStage = 'PICK_SOURCE';

    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    this.loadPairingItems(setupId);
    this.loadPairingConnections();
  }

  selectSourceItem(item: any): void {
    this.connectSourceItem = item;
    this.pairingStage = 'PICK_TARGET_SETUP';
  }

  selectTargetSetup(setup: any): void {
    this.connectTargetSetup = setup;
    this.pairingStage = 'PICK_TARGET_ITEM';

    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    this.loadTargetPairingItems(setupId);
  }

  finalizeConnection(target: { setup: any; item: any }): void {
    if (!this.connectSourceSetup || !this.connectSourceItem || !target?.setup || !target?.item) {
      return;
    }

    const from_setup_id = this.getSetupId(this.connectSourceSetup);
    const to_setup_id = this.getSetupId(target.setup);
    const from_device_id = this.getItemId(this.connectSourceItem);
    const to_device_id = this.getItemId(target.item);

    const from_device_type = this.mapItemCategoryToDeviceType(this.connectSourceItem?.category);
    const to_device_type = this.mapItemCategoryToDeviceType(target.item?.category);

    if (!from_setup_id || !to_setup_id || !from_device_id || !to_device_id) {
      console.error('❌ Hiányzó connection adatok');
      return;
    }

    this.http.post<any>('/api/setup/save-connection', {
      from_setup_id,
      to_setup_id,
      from_device_type,
      from_device_id,
      to_device_type,
      to_device_id,
      utp_id: 1
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.cancelConnecting();
        this.loadGlobalConnections();

        if (this.viewingSetup) {
          this.openSetupDetails(this.viewingSetup);
        }
      },
      error: (err) => {
        console.error('❌ Connection create hiba:', err);
      }
    });
  }

  mapItemCategoryToDeviceType(category: string): string {
    const value = String(category || '').toLowerCase();

    if (value.includes('pc_details')) return 'pc';
    if (value.includes('switches')) return 'switch';
    if (value.includes('router')) return 'router';
    if (value.includes('modem')) return 'modem';
    if (value.includes('home_theater')) return 'ht';
    if (value.includes('audio_processor')) return 'audiop';
    if (value.includes('mixer')) return 'mixer';

    return value.replace('[setup]', '').trim();
  }

  openItemOverlay(item: any): void {
    this.onWorkspaceItemClick(item);
  }

  onWorkspaceItemClick(item: any): void {
    if (!item) return;

    const category = String(item?.category || '').toLowerCase();

    if (category.includes('car_setup')) {
      this.selectedProduct = null;
      this.selectedPcItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedCarItem = item;
      return;
    }

    if (category.includes('pc_details')) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedPcItem = item;
      return;
    }

    if (
      category.includes('processors') ||
      category.includes('video_cards') ||
      category.includes('motherboard') ||
      category.includes('ram') ||
      category.includes('psu')
    ) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcItem = null;
      this.selectedHtItem = null;
      this.selectedPcPartItem = item;
      return;
    }

    if (
      category.includes('home_theater') ||
      category.includes('audio_processor') ||
      category.includes('front_speaker') ||
      category.includes('subwoofer') ||
      category.includes('center_speaker') ||
      category.includes('side_speaker') ||
      category.includes('back_speaker') ||
      category.includes('ceiling_speaker') ||
      category.includes('floor_speaker')
    ) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = item;
      return;
    }

    const table = item?.category;
    const id = item?.id;

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
    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    setup.x = pos.x;
    setup.y = pos.y;

    this.userSetups = this.userSetups.map(s => {
      const sid = this.getSetupId(s);
      return String(sid) === String(setupId)
        ? { ...s, x: pos.x, y: pos.y }
        : s;
    });

    this.http.patch(`/api/setup/rooms/${setupId}/update-position`, {
      x: pos.x,
      y: pos.y
    }, { withCredentials: true }).subscribe({
      next: () => {
        console.log(`✅ Room ${setupId} pozíció mentve`, pos);
      },
      error: (err) => {
        console.error('❌ pozíció mentés hiba:', err);
      }
    });
  }

  backToSetups(): void {
    this.viewingSetup = null;
    this.items = [];
    this.connections = [];
    this.selectedProduct = null;
    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;
    this.cancelConnecting();
    this.updateLines();
  }

  openDockItem(item: any): void {
    console.log('Dock item:', item);
  }

  private createSetupRequest(payload: any, onSuccess?: (res: any) => void): void {
    this.http.post<any>('/api/setup/create', payload, { withCredentials: true }).subscribe({
      next: (res) => {
        onSuccess?.(res);
      },
      error: (primaryErr) => {
        console.warn('⚠️ /api/setup/create failed, fallback to /api/setup-create/create', primaryErr);

        this.http.post<any>('/api/setup-create/create', payload, { withCredentials: true }).subscribe({
          next: (res) => {
            onSuccess?.(res);
          },
          error: (fallbackErr) => {
            console.error('❌ Setup creation hiba:', fallbackErr);
          }
        });
      }
    });
  }

  createNewSetup(customX?: number, customY?: number): void {
    if (!this.allowCreate) return;

    const payload = {
      setup_name: 'Új setup',
      x: customX ?? 50,
      y: customY ?? 50,
      setup_type: 'other',
      isFavorite: this.favoriteMode
    };

    this.createSetupRequest(payload, (res) => {
      if (res?.setup) {
        this.userSetups = [this.normalizeSetup(res.setup), ...this.userSetups];
        this.updateLines();
      }
    });
  }

  deleteSetupFromMenu(setup: any): void {
    if (!setup || this.isBusy) return;

    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    const name = this.getSetupTitle(setup);
    const ok = window.confirm(`Biztos törlöd?\n\n${name}`);
    if (!ok) return;

    this.isBusy = true;

    this.http.delete<any>(`/api/setup/${setupId}/remove-setup`, { withCredentials: true }).subscribe({
      next: () => {
        this.isBusy = false;
        this.userSetups = this.userSetups.filter(s => String(this.getSetupId(s)) !== String(setupId));

        if (this.viewingSetup && String(this.getSetupId(this.viewingSetup)) === String(setupId)) {
          this.backToSetups();
        }

        this.loadGlobalConnections();
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

    const id = this.getSetupId(setup);
    if (!id) return;

    setTimeout(() => {
      const el = document.querySelector(`[data-id="room:${id}"]`);
      const comp = (el as any)?.__ngContext__?.[8];
      comp?.startRename?.();
    });
  }

  saveRenamedRoom(data: any): void {
    if (!data) return;

    const setupId = this.getSetupId(data);
    const newName = data?.setup_name ?? data?.display_name ?? data?.name;

    if (!setupId || !newName) return;

    this.http.patch<any>(
      `/api/setup/${setupId}/update-setup`,
      { setup_name: newName },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const updated = res?.setup ?? { ...data, setup_name: newName };

        this.userSetups = this.userSetups.map(s => {
          const sid = this.getSetupId(s);
          return String(sid) === String(setupId)
            ? { ...s, ...updated, display_name: updated.setup_name }
            : s;
        });

        if (this.viewingSetup && String(this.getSetupId(this.viewingSetup)) === String(setupId)) {
          this.viewingSetup = {
            ...this.viewingSetup,
            ...updated,
            display_name: updated.setup_name
          };
        }
      },
      error: (err) => {
        console.error('❌ Setup átnevezés hiba:', err);
        alert('Átnevezés sikertelen.');
      }
    });
  }

  openDevicesWindowForCurrentSetup(_event?: any): void {
    if (this.viewingSetup && this.workspaceComp) {
      (this.workspaceComp as any).closeContextMenu?.();
      (this.workspaceComp as any).openDevicesWindow?.(this.viewingSetup);
    }
  }

  handleCategorySelected(event: any): void {
    if (!event) return;

    const category = typeof event === 'string' ? event : event.category;
    const setup = event.setup;
    const pos = event.pos;

    const catName = String(category || '').trim();
    const catNorm = catName.toLowerCase()
      .replace(/ő/g, 'o').replace(/ű/g, 'u').replace(/á/g, 'a')
      .replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o')
      .replace(/ö/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u');

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

    if (this.viewingSetup) {
      if (type === 'pc') {
        this.openPcBuilder(this.viewingSetup);
        return;
      }

      if (type === 'home_theater') {
        this.openEmptyWindowForCategory('Házimozi', this.viewingSetup);
        return;
      }

      if (type === 'car') {
        this.openDevicesWindowForCurrentSetup();
        return;
      }

      this.openDevicesWindowForCurrentSetup();
      return;
    }

    if (setup) {
      const setupId = this.getSetupId(setup);
      if (!setupId) return;

      this.http.patch<any>(`/api/setup/${setupId}/update-setup`, {
        setup_name: catName
      }, { withCredentials: true }).subscribe({
        next: (res) => {
          const updated = res?.setup || { ...setup, setup_name: catName };

          this.userSetups = this.userSetups.map(s => {
            const sid = this.getSetupId(s);
            return String(sid) === String(setupId) ? { ...s, ...updated } : s;
          });

          console.log('✅ Setup updated');
        },
        error: (err) => console.error('❌ Setup update hiba:', err)
      });

      return;
    }

    if (pos) {
      this.createSetupRequest({
        setup_name: catName || 'Új Setup',
        x: pos.x,
        y: pos.y,
        setup_type: type,
        isFavorite: this.favoriteMode
      }, (res) => {
        if (res?.setup) {
          this.userSetups = [this.normalizeSetup(res.setup), ...this.userSetups];
          console.log('✅ Setup created at:', pos);
          this.updateLines();
        }
      });
    }
  }

  openPcBuilder(setup: any): void {
    this.pcBuilderSetup = setup;
    this.pcBuilderOpen = true;
  }

  closePcBuilder(): void {
    this.pcBuilderOpen = false;
    this.pcBuilderSetup = null;
  }

  onPcBuilderSaved(): void {
    this.closePcBuilder();

    if (this.viewingSetup) {
      this.openSetupDetails(this.viewingSetup);
    }
  }

  openEmptyWindowForCategory(title: any, setup?: any): void {
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
      (this.workspaceComp as any).closeContextMenu?.();
      (this.workspaceComp as any).openEmptyWindow?.(finalTitle, target);
    }
  }
}
