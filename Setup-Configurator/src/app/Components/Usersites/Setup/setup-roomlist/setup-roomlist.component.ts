import {
  Component,
  OnInit,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { WorkspaceComponent } from '../workspace/workspace.component';
import { SetupCarDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-car-details-panel/setup-car-details-panel.component';
import { SetupPcDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-pc-details-panel/setup-pc-details-panel.component';
import { SetupPcPartDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-pc-part-details-panel/setup-pc-part-details-panel.component';
import { ProductDetailsPanelComponent } from '../../../Panels/Product/product-details-panel.component';
import { SetupHtDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-ht-details-panel/setup-ht-details-panel.component';
import { SetupInstrumentDetailsPanelComponent } from '../workspace/setup-windows/quick-builder/setup-instrument-details-panel/setup-instrument-details-panel.component';
import { SetupHierarchySidebarComponent } from './hierarchy-sidebar/setup-hierarchy-sidebar.component';
import { SetupHierarchyDetailsComponent } from './hierarchy-details/setup-hierarchy-details.component';
import { SetupHierarchyDevicePickerComponent } from './hierarchy-device-picker/setup-hierarchy-device-picker.component';
import { HomeTheaterService } from '../services/home-theater.service';

type PairingStage = 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM';

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    WorkspaceComponent,
    SetupCarDetailsPanelComponent,
    SetupPcDetailsPanelComponent,
    SetupPcPartDetailsPanelComponent,
    ProductDetailsPanelComponent,
    SetupHtDetailsPanelComponent,
    SetupHierarchySidebarComponent,
    SetupHierarchyDetailsComponent,
    SetupHierarchyDevicePickerComponent,
    SetupInstrumentDetailsPanelComponent
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
  rawGlobalConnections: any[] = [];

  selectedProduct: any = null;
  selectedCarItem: any = null;
  selectedInstrumentItem: any = null;
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
  private routeRoomId: string | null = null;
  hierarchyMode = false;
  treeExpanded = new Set<string>();
  treeChildren: Record<string, any[]> = {};
  treeLoading = new Set<string>();
  hierarchySelection: { kind: 'room' | 'item'; data: any } | null = null;
  hierarchyDetails: Array<{ key: string; value: any }> = [];
  hierarchyDetailsTitle = '';
  hierarchyDetailsSubtitle = '';
  hierarchyDetailsLoading = false;
  hierarchyDetailsError = '';
  rootTreeExpanded = true;
  hierarchyRootCtxOpen = false;
  hierarchyRootCtxX = 0;
  hierarchyRootCtxY = 0;
  hierarchySetupCtxOpen = false;
  hierarchySetupCtxX = 0;
  hierarchySetupCtxY = 0;
  hierarchySetupCtxTarget: any = null;
  hierarchyCategoryPickerSetup: any = null;
  hierarchyRightMode: 'details' | 'home_theater_picker' = 'details';
  hierarchyHtPickerSetup: any = null;
  hierarchyHtCatalog: Record<string, any[]> = {};
  hierarchyHtCatalogLoading = false;
  hierarchyHtCatalogError = '';
  hierarchyHtSelectedDevices: any[] = [];
  hierarchyHtSelectedLoading = false;
  hierarchyHtSelectedError = '';
  hierarchyHtRenameSaving = false;

  confirmDialogState: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
  } | null = null;
  readonly hierarchyCategories = ['Szamitogep', 'Autok', 'Hazimozi', 'Hangszerek', 'Egyeb'];
  readonly hierarchySetupTitle = (setup: any) => this.getSetupTitle(setup);
  readonly hierarchyTreeItemTitle = (item: any) => this.treeItemTitle(item);
  readonly hierarchyIsTreeExpanded = (setup: any) => this.isTreeExpanded(setup);
  readonly hierarchyIsTreeLoading = (setup: any) => this.isTreeLoading(setup);
  readonly hierarchyTreeChildrenFor = (setup: any) => this.treeChildrenFor(setup);

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private homeTheaterService: HomeTheaterService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.routeRoomId = params.get('roomId');
      this.syncRoomFromRoute();
    });

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
    const id = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    return {
      ...setup,
      id: id,
      setup_name: setup?.setup_name ?? setup?.name ?? 'Névtelen setup',
      isNote: setup?.isNote === true || setup?.is_note === true || setup?.isnote === true
    };
  }

  private buildRoomRoute(roomId?: number | string | null): any[] {
    if (this.favoriteMode) {
      return roomId == null ? ['/user', 'favorite'] : ['/user', 'favorite', roomId];
    }

    return roomId == null ? ['/user', 'setup'] : ['/user', 'setup', roomId];
  }

  toggleHierarchyMode(checked: boolean): void {
    this.hierarchyMode = checked;
    if (!checked) {
      this.resetHierarchyRightPanel();
      this.hierarchySelection = null;
      this.hierarchyDetails = [];
      this.hierarchyDetailsTitle = '';
      this.hierarchyDetailsSubtitle = '';
      this.hierarchyDetailsLoading = false;
      this.hierarchyDetailsError = '';
    }
  }

  isTreeExpanded(setup: any): boolean {
    const setupId = this.getSetupId(setup);
    return setupId != null ? this.treeExpanded.has(String(setupId)) : false;
  }

  toggleRootTree(event?: MouseEvent): void {
    event?.stopPropagation();
    this.rootTreeExpanded = !this.rootTreeExpanded;
  }

  onHierarchyRootRightClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeHierarchySetupContextMenu();
    this.hierarchyRootCtxOpen = true;
    this.hierarchyRootCtxX = event.clientX;
    this.hierarchyRootCtxY = event.clientY;
  }

  closeHierarchyRootContextMenu(): void {
    this.hierarchyRootCtxOpen = false;
  }

  onHierarchySetupRightClick(setup: any, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeHierarchyRootContextMenu();
    this.hierarchySetupCtxOpen = true;
    this.hierarchySetupCtxX = event.clientX;
    this.hierarchySetupCtxY = event.clientY;
    this.hierarchySetupCtxTarget = setup;
  }

  closeHierarchySetupContextMenu(): void {
    this.hierarchySetupCtxOpen = false;
    this.hierarchySetupCtxTarget = null;
  }

  createSetupFromHierarchyRoot(): void {
    this.closeHierarchyRootContextMenu();
    this.createNewSetup();
  }

  openHierarchyCategoryPickerFromContext(): void {
    this.hierarchyCategoryPickerSetup = this.hierarchySetupCtxTarget;
    this.closeHierarchySetupContextMenu();
  }

  closeHierarchyCategoryPicker(): void {
    this.hierarchyCategoryPickerSetup = null;
  }

  selectHierarchyCategory(category: string): void {
    const setup = this.hierarchyCategoryPickerSetup;
    this.hierarchyCategoryPickerSetup = null;
    if (!setup) return;

    const normalized = String(category || '')
      .trim()
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöôő]/g, 'o')
      .replace(/[úùüûű]/g, 'u');

    if (normalized.includes('hazimozi') || normalized.includes('home')) {
      this.openHierarchyHtPicker(setup);
      return;
    }

    this.resetHierarchyRightPanel();
    this.handleCategorySelected({ category, setup });
  }

  openHierarchySetupFromContext(): void {
    const target = this.hierarchySetupCtxTarget;
    this.closeHierarchySetupContextMenu();
    if (!target) return;
    this.openSetupDetails(target);
  }

  renameHierarchySetupFromContext(): void {
    const target = this.hierarchySetupCtxTarget;
    this.closeHierarchySetupContextMenu();
    if (!target) return;

    const currentName = this.getSetupTitle(target);
    const newName = window.prompt('Uj setup nev:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    this.saveRenamedRoom({
      ...target,
      setup_name: newName.trim(),
      display_name: newName.trim(),
      name: newName.trim()
    });
  }

  deleteHierarchySetupFromContext(): void {
    const target = this.hierarchySetupCtxTarget;
    this.closeHierarchySetupContextMenu();
    if (!target) return;
    this.deleteSetupFromMenu(target);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeHierarchyRootContextMenu();
    this.closeHierarchySetupContextMenu();
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeHierarchyRootContextMenu();
    this.closeHierarchySetupContextMenu();
  }

  toggleTreeSetup(setup: any, event?: MouseEvent): void {
    event?.stopPropagation();
    const setupId = this.getSetupId(setup);
    if (setupId == null) return;

    const key = String(setupId);
    if (this.treeExpanded.has(key)) {
      this.treeExpanded.delete(key);
      return;
    }

    this.treeExpanded.add(key);

    if (this.treeChildren[key] || this.treeLoading.has(key)) {
      return;
    }

    this.treeLoading.add(key);
    this.http.get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true }).subscribe({
      next: (children) => {
        this.treeChildren[key] = Array.isArray(children) ? children : [];
        this.treeLoading.delete(key);
      },
      error: (err) => {
        console.error('Hierarchy children hiba:', err);
        this.treeChildren[key] = [];
        this.treeLoading.delete(key);
      }
    });
  }

  treeChildrenFor(setup: any): any[] {
    const setupId = this.getSetupId(setup);
    if (setupId == null) return [];
    return this.treeChildren[String(setupId)] || [];
  }

  isTreeLoading(setup: any): boolean {
    const setupId = this.getSetupId(setup);
    return setupId != null ? this.treeLoading.has(String(setupId)) : false;
  }

  treeItemTitle(item: any): string {
    return (
      item?.display_name ??
      item?.setup_name ??
      item?.name ??
      item?.model ??
      item?.product_name ??
      'Nevtelen eszkoz'
    );
  }

  selectHierarchyRoom(setup: any, event?: MouseEvent): void {
    event?.stopPropagation();
    this.resetHierarchyRightPanel();
    this.hierarchySelection = null;
    this.hierarchyDetailsTitle = '';
    this.hierarchyDetailsSubtitle = '';
    this.hierarchyDetailsLoading = false;
    this.hierarchyDetailsError = '';
    this.hierarchyDetails = [];
    return;
    this.hierarchyDetails = [
      { key: 'ID', value: this.getSetupId(setup) },
      { key: 'Nev', value: this.getSetupTitle(setup) },
      { key: 'Kedvenc', value: setup?.isFavorite ? 'Igen' : 'Nem' },
      { key: 'X', value: setup?.x ?? '—' },
      { key: 'Y', value: setup?.y ?? '—' }
    ];
  }

  selectHierarchyItem(item: any, event?: MouseEvent): void {
    event?.stopPropagation();
    this.hierarchyRightMode = 'details';
    this.hierarchyHtPickerSetup = null;
    this.hierarchySelection = { kind: 'item', data: item };
    this.hierarchyDetailsTitle = this.treeItemTitle(item);
    this.hierarchyDetailsSubtitle = this.resolveHierarchySubtitle(item);
    this.hierarchyDetailsLoading = true;
    this.hierarchyDetailsError = '';
    this.hierarchyDetails = [];

    const itemType = String(item?.setup_type ?? item?.type ?? '').toLowerCase();
    const itemId = Number(item?.id ?? item?.ID ?? 0);

    if (!itemId) {
      this.hierarchyDetailsLoading = false;
      this.hierarchyDetails = this.buildGenericHierarchyDetails(item);
      return;
    }

    if (itemType.includes('car')) {
      this.http.get<any>(`/api/setup/car-setup/${itemId}/details`, { withCredentials: true }).subscribe({
        next: (details) => {
          this.hierarchyDetailsLoading = false;
          this.hierarchyDetails = this.objectToHierarchyDetails(details?.fields || {});
        },
        error: () => {
          this.hierarchyDetailsLoading = false;
          this.hierarchyDetails = this.buildGenericHierarchyDetails(item);
        }
      });
      return;
    }

    if (itemType.includes('pc')) {
      this.http.get<any>(`/api/setup/${itemId}/get-pcparts`, { withCredentials: true }).subscribe({
        next: (response) => {
          this.hierarchyDetailsLoading = false;
          const rows = (Array.isArray(response?.parts) ? response.parts : [])
            .filter((part: any) => part)
            .map((part: any) => ({
              key: this.prettyPcSlot(part?.slot || part?.type || 'alkatresz'),
              value:
                part?.display_name ??
                part?.name ??
                part?.model ??
                part?.manufacturer_model ??
                `#${part?.id ?? '?'}`
            }));

          this.hierarchyDetails = rows;
        },
        error: () => {
          this.hierarchyDetailsLoading = false;
          this.hierarchyDetails = [];
        }
      });
      return;
    }

    if (itemType.includes('home_theater')) {
      this.http.get<any[]>(`/api/home-theater/${itemId}/devices`, { withCredentials: true }).subscribe({
        next: (devices) => {
          this.hierarchyDetailsLoading = false;
          const rows = (Array.isArray(devices) ? devices : []).map((device) => ({
            key: this.prettyRole(device?.role || 'eszkoz'),
            value: this.treeItemTitle(device)
          }));
          this.hierarchyDetails = rows.length ? rows : this.buildGenericHierarchyDetails(item);
        },
        error: () => {
          this.hierarchyDetailsLoading = false;
          this.hierarchyDetails = this.buildGenericHierarchyDetails(item);
        }
      });
      return;
    }

    this.hierarchyDetailsLoading = false;
    this.hierarchyDetails = this.buildGenericHierarchyDetails(item);
  }

  private resolveHierarchySubtitle(item: any): string {
    const type = String(item?.setup_type ?? item?.type ?? item?.category ?? '').toLowerCase();
    if (type.includes('car')) return 'Auto adatok';
    if (type.includes('home_theater')) return 'Hazimozi adatok';
    if (type.includes('pc')) return 'PC adatok';
    return 'Elem adatok';
  }

  private buildGenericHierarchyDetails(item: any): Array<{ key: string; value: any }> {
    return this.objectToHierarchyDetails({
      ID: item?.id ?? item?.ID ?? '—',
      Nev: this.treeItemTitle(item),
      Tipus: item?.setup_type ?? item?.type ?? item?.category ?? '—',
      X: item?.x ?? item?.pos_x ?? '—',
      Y: item?.y ?? item?.pos_y ?? '—'
    });
  }

  private objectToHierarchyDetails(source: any): Array<{ key: string; value: any }> {
    if (!source || typeof source !== 'object') return [];

    return Object.entries(source)
      .filter(([key, value]) => {
        const normalized = String(key || '').toLowerCase();
        return !['car', 'fields'].includes(normalized) && value !== null && value !== undefined && value !== '';
      })
      .map(([key, value]) => ({
        key: String(key),
        value: value
      }));
  }

  private prettyRole(role: string): string {
    const normalized = String(role || '').toLowerCase();
    const labels: Record<string, string> = {
      receiver: 'Receiver',
      bass_amplifier: 'Bass Amplifier',
      front_left: 'Front Left',
      front_right: 'Front Right',
      center: 'Center',
      surround_left: 'Surround Left',
      surround_right: 'Surround Right',
      back_left: 'Back Left',
      back_right: 'Back Right',
      subwoofer: 'Subwoofer'
    };

    return labels[normalized] || role;
  }

  private prettyHtCatalogCategory(key: string): string {
    const labels: Record<string, string> = {
      htDevices: 'HT eszkozok',
      receivers: 'Receiverek',
      frontSpeakers: 'Front hangfalak',
      backSpeakers: 'Hatso hangfalak',
      sideSpeakers: 'Oldalso hangfalak',
      ceilingSpeakers: 'Mennyezeti hangfalak',
      floorSpeakers: 'Allo hangfalak',
      centerSpeakers: 'Center hangfalak',
      subwoofers: 'Subwooferek',
      audioProcessors: 'Audio processzorok',
      bassAmplifiers: 'Bass amplifier'
    };

    return labels[key] || key;
  }

  readonly hierarchyHtCategoryName = (key: string) => this.prettyHtCatalogCategory(key);
  readonly hierarchyHtProductName = (product: any) =>
    product?.name ?? product?.model ?? product?.display_name ?? 'Eszkoz';
  readonly hierarchyHtRoleName = (role: string) => this.prettyRole(role);

  private resetHierarchyRightPanel(): void {
    this.hierarchyRightMode = 'details';
    this.hierarchyHtPickerSetup = null;
    this.hierarchyHtCatalogError = '';
    this.hierarchyHtSelectedError = '';
    this.hierarchyHtCatalogLoading = false;
    this.hierarchyHtSelectedLoading = false;
    this.hierarchyHtSelectedDevices = [];
    this.hierarchyHtRenameSaving = false;
  }

  private openHierarchyHtPicker(setup: any): void {
    this.hierarchySelection = null;
    this.hierarchyDetails = [];
    this.hierarchyDetailsTitle = '';
    this.hierarchyDetailsSubtitle = '';
    this.hierarchyDetailsLoading = false;
    this.hierarchyDetailsError = '';

    this.hierarchyRightMode = 'home_theater_picker';
    this.hierarchyHtPickerSetup = setup;
    this.loadHierarchyHtCatalog();
    this.loadHierarchyHtSelectedDevices(setup);
  }

  private loadHierarchyHtCatalog(): void {
    if (Object.keys(this.hierarchyHtCatalog || {}).length) {
      return;
    }

    this.hierarchyHtCatalogLoading = true;
    this.hierarchyHtCatalogError = '';
    this.homeTheaterService.getCatalog().subscribe({
      next: (catalog) => {
        this.hierarchyHtCatalog = catalog && typeof catalog === 'object' ? catalog : {};
        this.hierarchyHtCatalogLoading = false;
      },
      error: (err) => {
        console.error('HT katalogus hiba:', err);
        this.hierarchyHtCatalogLoading = false;
        this.hierarchyHtCatalogError = 'Nem sikerult betolteni a HT katalogust.';
      }
    });
  }

  private loadHierarchyHtSelectedDevices(setup: any): void {
    const setupId = this.getSetupId(setup);
    if (!setupId) {
      this.hierarchyHtSelectedDevices = [];
      return;
    }

    this.hierarchyHtSelectedLoading = true;
    this.hierarchyHtSelectedError = '';
    this.http.get<any[]>(`/api/home-theater/${setupId}/devices`, { withCredentials: true }).subscribe({
      next: (devices) => {
        this.hierarchyHtSelectedDevices = Array.isArray(devices) ? devices : [];
        this.hierarchyHtSelectedLoading = false;
      },
      error: (err) => {
        console.error('HT eszkozlista hiba:', err);
        this.hierarchyHtSelectedDevices = [];
        this.hierarchyHtSelectedLoading = false;
        this.hierarchyHtSelectedError = 'Nem sikerult betolteni a setup eszkozeit.';
      }
    });
  }

  private refreshHierarchySetupChildren(setup: any): void {
    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    const key = String(setupId);
    this.treeLoading.add(key);
    this.http.get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true }).subscribe({
      next: (children) => {
        this.treeChildren[key] = Array.isArray(children) ? children : [];
        this.treeLoading.delete(key);
      },
      error: (err) => {
        console.error('Hierarchy refresh hiba:', err);
        this.treeLoading.delete(key);
      }
    });
  }

  addHierarchyHtDevice(event: { product: any; categoryKey: string }): void {
    const setupId = this.getSetupId(this.hierarchyHtPickerSetup);
    const productId = Number(event?.product?.id);
    const role = String(event?.categoryKey || '').trim();

    if (!setupId || !productId || !role) return;

    this.hierarchyHtSelectedLoading = true;
    this.hierarchyHtSelectedError = '';

    this.http.post<any>('/api/home-theater/device', {
      setup_id: setupId,
      device_type: role,
      device_ref_id: productId
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.loadHierarchyHtSelectedDevices(this.hierarchyHtPickerSetup);
        this.refreshHierarchySetupChildren(this.hierarchyHtPickerSetup);
      },
      error: (err) => {
        console.error('HT eszkoz hozzaadas hiba:', err);
        this.hierarchyHtSelectedLoading = false;
        this.hierarchyHtSelectedError = 'Nem sikerult hozzaadni az eszkozt.';
      }
    });
  }

  renameHierarchyHtSetup(newName: string): void {
    const target = this.hierarchyHtPickerSetup;
    const setupId = this.getSetupId(target);
    const trimmed = String(newName || '').trim();
    if (!setupId || !trimmed) return;

    this.hierarchyHtRenameSaving = true;
    this.http.patch<any>(`/api/setup/${setupId}/update-setup`, {
      setup_name: trimmed
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        const updated = res?.setup ?? {
          ...target,
          setup_name: trimmed,
          display_name: trimmed,
          name: trimmed
        };

        this.userSetups = this.userSetups.map((setup) =>
          String(this.getSetupId(setup)) === String(setupId)
            ? { ...setup, ...updated }
            : setup
        );

        this.hierarchyHtPickerSetup = { ...target, ...updated };
        this.hierarchyHtRenameSaving = false;
      },
      error: (err) => {
        console.error('HT setup atnevezes hiba:', err);
        this.hierarchyHtRenameSaving = false;
      }
    });
  }

  private prettyPcSlot(slot: string): string {
    const normalized = String(slot || '').toLowerCase();
    const labels: Record<string, string> = {
      cpu: 'Processzor',
      motherboard: 'Alaplap',
      gpu: 'Videokartya',
      ram: 'RAM',
      psu: 'Tapegyseg',
      storage: 'Tarolo',
      ssd: 'SSD',
      hdd: 'HDD',
      cpu_cooler: 'CPU Huto',
      case: 'Haz',
      soundcard: 'Hangkartya',
      network_card: 'Halozati Kartya',
      monitor: 'Monitor',
      keyboard: 'Billentyuzet',
      mouse: 'Eger',
      headset: 'Headset',
      speaker: 'Hangfal'
    };

    return labels[normalized] || String(slot || 'Alkatresz');
  }

  private syncRoomFromRoute(): void {
    if (!this.routeRoomId) {
      if (this.viewingSetup) {
        this.backToSetups(false);
      }
      return;
    }

    if (!this.userSetups.length) return;

    const target = this.userSetups.find((setup) => String(this.getSetupId(setup)) === String(this.routeRoomId));
    if (!target) return;

    if (this.viewingSetup && String(this.getSetupId(this.viewingSetup)) === String(this.routeRoomId)) {
      return;
    }

    this.openSetupDetails(target, false);
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
        this.syncRoomFromRoute();
        this.processGlobalConnections(this.rawGlobalConnections);
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
        this.rawGlobalConnections = Array.isArray(res) ? res : [];
        this.processGlobalConnections(this.rawGlobalConnections);
      },
      error: (err) => {
        console.error('❌ Global connections hiba:', err);
        this.globalRoomConnections = [];
      }
    });
  }

  processGlobalConnections(allConns: any[]): void {
    if (!allConns || !allConns.length || !this.userSetups.length) {
      this.globalRoomConnections = [];
      return;
    }

    const aggregated = new Map<string, any>();

    allConns.forEach(conn => {
      const sId = String(conn.from_setup_id);
      const tId = String(conn.to_setup_id);

      if (sId !== tId) {
        const key = [sId, tId].sort().join('-');

        if (!aggregated.has(key)) {
          aggregated.set(key, {
            id: `global-${key}`,
            source: { category: 'setup', id: sId },
            target: { category: 'setup', id: tId }
          });
        }
      }
    });

    this.globalRoomConnections = Array.from(aggregated.values());
    console.log('🔄 Global connections processed:', this.globalRoomConnections.length);
    this.updateLines();
  }

  updateLines(): void {
    this.lineRefreshTrigger++;
    setTimeout(() => {
        this.workspaceComp?.updateLines?.();
    });
  }

  getSetupTitle(setup: any): string {
    return setup?.setup_name ?? setup?.display_name ?? setup?.name ?? 'Setup';
  }

  isNoteSetup(setup: any): boolean {
    return setup?.isNote === true || setup?.is_note === true || setup?.isnote === true;
  }

  onSetupClick(setup: any): void {
    if (this.pairingStage === 'PICK_TARGET_SETUP') {
      this.selectTargetSetup(setup);
    }
  }

  onSetupDetails(setup: any): void {
    this.openSetupDetails(setup);
  }

  openSetupDetails(setup: any, updateRoute = true): void {
    if (!setup) return;

    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    if (this.isNoteSetup(setup)) {
      this.workspaceComp?.openDevicesWindow(this.normalizeSetup(setup));
      return;
    }

    if (updateRoute) {
      this.router.navigate(this.buildRoomRoute(setupId));
    }

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
        this.processConnections(res || []);
        this.loadingItems = false;
      },
      error: (err) => {
        console.error('❌ Setup connections hiba:', err);
        this.connections = [];
        this.loadingItems = false;
      }
    });
  }

  processConnections(raw: any[]): void {
    if (!raw.length) {
      this.connections = [];
      return;
    }

    const currentSetupId = String(this.getSetupId(this.viewingSetup) ?? '');

    this.connections = raw
      .filter((c) => {
        const fromSetupId = String(c?.from_setup_id ?? '');
        const toSetupId = String(c?.to_setup_id ?? '');

        if (!currentSetupId) return fromSetupId === toSetupId;
        return fromSetupId === currentSetupId && toSetupId === currentSetupId;
      })
      .map(c => {
      return {
        ...c,
        crossSetup: false,
        cableLabel: 'utp',
        source: {
          category: this.mapTypeToCategory(c.from_device_type, c?.source?.category),
          id: c.from_device_id
        },
        target: {
          category: this.mapTypeToCategory(c.to_device_type, c?.target?.category),
          id: c.to_device_id
        }
      };
    });
    this.updateLines();
  }

  private isAllowedConnectionType(type: string): boolean {
    const normalized = String(type || '').toLowerCase().replace('[setup]', '').trim();
    return [
      'pc',
      'ht',
      'home_theater',
      'network_card',
      'router',
      'switch',
      'modem'
    ].includes(normalized);
  }

  private normalizeConnectableType(value: any): string {
    return String(value || '')
      .toLowerCase()
      .replace('[setup]', '')
      .replace(/[\s-]+/g, '_')
      .trim();
  }

  private itemTypeHaystack(itemOrCategory: any): string {
    if (typeof itemOrCategory === 'string') {
      return this.normalizeConnectableType(itemOrCategory);
    }

    return [
      itemOrCategory?.setup_type,
      itemOrCategory?.type,
      itemOrCategory?.device_type,
      itemOrCategory?.category,
      itemOrCategory?.source_table,
      itemOrCategory?.table_name,
      itemOrCategory?.table,
      itemOrCategory?.slot,
      itemOrCategory?.display_name,
      itemOrCategory?.setup_name,
      itemOrCategory?.name,
      itemOrCategory?.model
    ].map((value) => this.normalizeConnectableType(value)).filter(Boolean).join(' ');
  }

  private mapTypeToCategory(type: string, fallback?: string): string {
    const t = String(type || fallback || '').toLowerCase().replace('[setup]', '').trim();
    if (!t || t === 'room') return 'setup';
    return t;
  }

  loadPairingItems(setupId: number | string): void {
    this.http.get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.pairingItems = Array.isArray(res) ? res : [];
        if (this.pairingStage === 'PICK_SOURCE') {
          this.workspaceComp?.openPairingWindow(this.connectSourceSetup, 'PICK_SOURCE', this.pairingItems);
        }
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
        if (this.pairingStage === 'PICK_TARGET_ITEM') {
          this.workspaceComp?.openPairingWindow(this.connectTargetSetup, 'PICK_TARGET_ITEM', this.pairingTargetItems);
        }
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
    this.workspaceComp?.closePairingWindows();
  }

  startConnectingFromMenu(setup: any): void {
    if (!setup) return;

    this.cancelConnecting();
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
    const sourceType = this.mapItemCategoryToDeviceType(item);
    if (!this.isAllowedConnectionType(sourceType)) {
      console.warn('Csak PC és házimozi setup köthető össze.');
      return;
    }

    this.connectSourceItem = item;
    this.pairingStage = 'PICK_TARGET_SETUP';
    this.workspaceComp?.closeWindow('pairing_source');
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

    const from_device_type = this.mapItemCategoryToDeviceType(this.connectSourceItem);
    const to_device_type = this.mapItemCategoryToDeviceType(target.item);

    if (!from_setup_id || !to_setup_id || !from_device_id || !to_device_id) {
      console.error('❌ Hiányzó connection adatok');
      return;
    }

    if (!this.isAllowedConnectionType(from_device_type) || !this.isAllowedConnectionType(to_device_type)) {
      console.warn('Csak PC és házimozi setup köthető össze UTP kábellel.');
      return;
    }

    this.http.post<any>('/api/setup/save-connection', {
      name: 'utp',
      setup_from: from_setup_id,
      setup_to: to_setup_id,
      device_from: from_device_id,
      device_to: to_device_id,
      port_type: 'utp',
      from_setup_id,
      to_setup_id,
      from_device_type,
      from_device_id,
      to_device_type,
      to_device_id
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.cancelConnecting();
        this.loadGlobalConnections();
        this.workspaceComp?.closeWindow('pairing_target');

        if (this.viewingSetup) {
          this.openSetupDetails(this.viewingSetup);
        }
      },
      error: (err) => {
        console.error('❌ Connection create hiba:', err);
      }
    });
  }

  mapItemCategoryToDeviceType(itemOrCategory: any): string {
    const setupType = this.itemTypeHaystack(itemOrCategory);

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
    if (setupType === 'setup') return 'setup';

    return setupType.trim();
  }

  openItemOverlay(item: any): void {
    this.onWorkspaceItemClick(item);
  }

  onWorkspaceItemClick(item: any): void {
    if (!item) return;

    const category = String(item?.category || '').toLowerCase();
    const setupType = String(item?.setup_type ?? item?.type ?? '').toLowerCase();

    if (setupType.includes('car') || category.includes('car_setup')) {
      this.selectedProduct = null;
      this.selectedPcItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedInstrumentItem = null;
      this.selectedCarItem = item;
      return;
    }

    if (setupType === 'instrument' || setupType === 'inst' || category === 'instrument') {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedInstrumentItem = item;
      return;
    }

    if (setupType.includes('pc') || category.includes('pc_details')) {
      this.selectedProduct = null;
      this.selectedCarItem = null;
      this.selectedPcPartItem = null;
      this.selectedHtItem = null;
      this.selectedInstrumentItem = null;
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
      setupType.includes('home_theater') ||
      setupType === 'ht' ||
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
      this.selectedInstrumentItem = null;
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
    this.selectedInstrumentItem = null;
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
    this.selectedInstrumentItem = null;
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

  backToSetups(updateRoute = true): void {
    if (updateRoute) {
      this.router.navigate(this.buildRoomRoute(null));
    }
    this.viewingSetup = null;
    this.items = [];
    this.connections = [];
    this.selectedProduct = null;
    this.selectedCarItem = null;
    this.selectedPcItem = null;
    this.selectedPcPartItem = null;
    this.selectedHtItem = null;
    this.cancelConnecting();
    this.processGlobalConnections(this.rawGlobalConnections);
    this.updateLines();
  }

  openDockItem(item: any): void {
    console.log('Dock item:', item);
  }

  private createSetupRequest(payload: any, onSuccess?: (res: any) => void): void {
    this.http.post<any>('/api/setup/save-setup', payload, { withCredentials: true }).subscribe({
      next: (res) => {
        onSuccess?.(res);
      },
      error: (err) => {
        console.error('❌ Setup creation hiba:', err);
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
      isFavorite: this.favoriteMode,
      isNote: false
    };

    this.createSetupRequest(payload, (res) => {
      if (res?.setup) {
        this.userSetups = [res.setup, ...this.userSetups];
        this.updateLines();
      }
    });
  }

  deleteSetupFromMenu(setup: any): void {
    if (!setup || this.isBusy) return;

    const setupId = this.getSetupId(setup);
    if (!setupId) return;

    const name = this.getSetupTitle(setup);

    this.confirmDialogState = {
      isOpen: true,
      title: 'Biztos törlöd?',
      message: name,
      onConfirm: () => {
        this.confirmDialogState = null;
        this.executeDeleteSetup(setupId);
      }
    };
  }

  private executeDeleteSetup(setupId: number): void {
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
        this.confirmDialogState = {
          isOpen: true,
          title: 'Torles sikertelen',
          message: err?.error?.error || 'A setup torlese nem sikerult.',
          confirmText: 'Rendben',
          hideCancel: true,
          onConfirm: () => {
            this.confirmDialogState = null;
          }
        };
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

  saveRenamedItem(data: any): void {
    if (!data) return;

    const itemId = data?.id ?? data?.ID ?? data?.item_id;
    const tableName = data?.category ?? data?.source_table ?? data?.table_name;
    const newName = data?.renamed_name;

    if (!itemId || !tableName || !newName) return;

    this.http.patch<any>(
      `/api/setup/update-item`,
      { itemId, tableName, newName },
      { withCredentials: true }
    ).subscribe({
      next: () => {

        this.items = this.items.map(it => {
          const itId = it?.id ?? it?.ID ?? it?.item_id;
          const itTab = it?.category ?? it?.source_table ?? it?.table_name;

          if (String(itId) === String(itemId) && itTab === tableName) {
            return {
              ...it,
              display_name: newName,
              setup_name: newName,
              name: newName
            };
          }
          return it;
        });
      },
      error: (err) => {
        console.error('❌ Item átnevezés hiba:', err);
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
        isFavorite: this.favoriteMode,
        isNote: false
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
    const target = setup || this.viewingSetup;
    if (!target) return;

    if (this.workspaceComp) {
      (this.workspaceComp as any).closeContextMenu?.();
      (this.workspaceComp as any).openPcBuilderWindow?.(target);
    }
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


