import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type PcPart = {
  id: number;
  slot: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' | 'other';
  source_table: string;
  display_name: string;
  manufacturer?: string;
  model?: string;
  socket?: string;
  ram_type?: string;
  wattage?: string;
  efficiency?: string;
  price?: number | string;
};

type PcBuilderMode = 'build' | 'all_in_one' | 'laptop';

@Component({
  selector: 'app-pc-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pc-builder-panel.component.html',
  styleUrls: ['./pc-builder-panel.component.css']
})
export class PcBuilderPanelComponent implements OnChanges {
  @Input() setup: any;
  @Input() editChildSetupId: number | null = null;
  @Input() initialProductId: number | null = null;
  @Input() initialPcSetup: any | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  processors: PcPart[] = [];
  motherboards: PcPart[] = [];
  rams: PcPart[] = [];
  gpus: PcPart[] = [];
  psus: PcPart[] = [];
  computerProducts: any[] = [];
  loadingComputerProducts = false;

  selectedProcessorId: number | null = null;
  selectedMotherboardId: number | null = null;
  selectedRamId: number | null = null;
  selectedGpuId: number | null = null;
  selectedPsuId: number | null = null;
  selectedComputerId: number | null = null;

  mode: PcBuilderMode = 'build';
  computerSearch = '';
  buildName = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.resetSelections();
      this.loadAllParts();
      this.loadComputerProducts();
    }
    if (changes['initialProductId'] && this.initialProductId != null) {
      this.selectedComputerId = Number(this.initialProductId);
    }
    if (changes['initialPcSetup'] && this.initialPcSetup) {
      this.applyInitialPcSetup(this.initialPcSetup);
    }
    if (changes['editChildSetupId'] && this.editChildSetupId && this.initialPcSetup) {
      this.applyInitialPcSetup(this.initialPcSetup);
    }
  }

  private applyInitialPcSetup(pc: any): void {
    // Expecting a child setup enriched by backend (`enrichPcSetupRows`), so it can contain part ids.
    const name = String(pc?.setup_name ?? pc?.name ?? '').trim();
    const processorId = Number(pc?.processor_id ?? 0) || null;
    const motherboardId = Number(pc?.motherboard_id ?? 0) || null;
    const ramId = Number(pc?.ram_id ?? 0) || null;
    const gpuId = Number(pc?.videocard_id ?? 0) || null;
    const psuId = Number(pc?.psu_id ?? 0) || null;

    if (name) this.buildName = name;

    // If it looks like a custom build, switch to build mode and preselect parts.
    if (processorId || motherboardId || ramId || gpuId || psuId) {
      this.mode = 'build';
      this.selectedComputerId = null;
      this.selectedProcessorId = processorId;
      this.selectedMotherboardId = motherboardId;
      this.selectedRamId = ramId;
      this.selectedGpuId = gpuId;
      this.selectedPsuId = psuId;
      return;
    }

    // Otherwise, if we have a product id, keep current ready-PC selection behavior.
    const productId = Number(pc?.product_id ?? pc?.device_id ?? 0) || null;
    if (productId) {
      this.selectedComputerId = productId;
      // Temporarily switch out of build mode so the ready-PC UI is visible.
      // The exact ready mode (Laptop vs Egybegép) will be determined after catalog load.
      this.mode = 'all_in_one';
      this.applyReadyComputerModeFromSelectedProduct();
    }
  }

  private applyReadyComputerModeFromSelectedProduct(): void {
    if (!this.selectedComputerId) return;
    if (this.isBuildMode()) return;

    const product = this.computerProducts.find((p) => this.getId(p) === this.selectedComputerId) ?? null;
    if (!product) return;

    const category = this.getProductCategory(product);
    if (category === 'laptop') {
      this.mode = 'laptop';
      return;
    }
    if (category === 'desktop') {
      this.mode = 'all_in_one';
      return;
    }
  }

  private resetSelections(): void {
    this.selectedProcessorId = null;
    this.selectedMotherboardId = null;
    this.selectedRamId = null;
    this.selectedGpuId = null;
    this.selectedPsuId = null;
    this.selectedComputerId = null;
    this.mode = 'build';
    this.computerSearch = '';
    this.buildName = '';
    this.error = '';
    this.success = '';
  }

  private setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private unwrapParts(res: any): PcPart[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.parts)) return res.parts;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
  }

  private normalizeSocket(value: any): string {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return '';

    const compact = raw.replace(/\s+/g, '').replace(/SOCKET/g, '');

    const knownPatterns = [
      /LGA-?1851/,
      /LGA-?1700/,
      /LGA-?1200/,
      /LGA-?1151/,
      /LGA-?1150/,
      /LGA-?3647/,
      /SWRX8/,
      /STRX4/,
      /TR4/,
      /AM5/,
      /AM4/,
      /AM3\+/,
      /AM3/,
      /AM2\+/,
      /AM2/,
      /FM2\+/,
      /FM2/,
      /FM1/
    ];

    for (const pattern of knownPatterns) {
      const match = compact.match(pattern);
      if (match) {
        return match[0].replace('-', '');
      }
    }

    return compact;
  }

  private normalizeRamType(value: any): string {
    const v = String(value ?? '').trim().toUpperCase();
    if (!v) return '';
    if (v.includes('DDR5')) return 'DDR5';
    if (v.includes('DDR4')) return 'DDR4';
    if (v.includes('DDR3')) return 'DDR3';
    return v;
  }

  private normalizePart(part: any): PcPart {
    return {
      ...part,
      id: Number(part?.id ?? part?.ID ?? 0),
      socket: this.normalizeSocket(part?.socket),
      ram_type: this.normalizeRamType(part?.ram_type)
    };
  }

  private loadAllParts(): void {
    const sid = this.setupId();
    if (!sid) {
      this.error = 'Missing setup id.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.http.get<any>(`/api/setup/${sid}/get-pcparts`, { withCredentials: true }).subscribe({
      next: (res) => {
        const parts = this.unwrapParts(res).map(p => this.normalizePart(p));

        this.processors = parts.filter((part: PcPart) => part.slot === 'cpu');
        this.motherboards = parts.filter((part: PcPart) => part.slot === 'motherboard');
        this.rams = parts.filter((part: PcPart) => part.slot === 'ram');
        this.gpus = parts.filter((part: PcPart) => part.slot === 'gpu');
        this.psus = parts.filter((part: PcPart) => part.slot === 'psu');

        this.loading = false;
      },
      error: (err) => {
        console.error('PC builder load error:', err);
        this.error = 'Failed to load PC parts.';
        this.loading = false;
      }
    });
  }

  private loadComputerProducts(): void {
    this.loadingComputerProducts = true;

    this.http.get<any>('/api/computers', {
      withCredentials: true,
      params: { limit: 2000 }
    }).subscribe({
      next: (res) => {
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        this.computerProducts = items;
        this.loadingComputerProducts = false;

        // If we're editing a ready computer, auto-switch to the correct tab (Laptop/Egybegép).
        // This can only be decided once the catalog is loaded.
        if (this.initialPcSetup) {
          const hasParts =
            Number(this.initialPcSetup?.processor_id ?? 0) ||
            Number(this.initialPcSetup?.motherboard_id ?? 0) ||
            Number(this.initialPcSetup?.ram_id ?? 0) ||
            Number(this.initialPcSetup?.videocard_id ?? 0) ||
            Number(this.initialPcSetup?.psu_id ?? 0);

          if (!hasParts) {
            this.applyReadyComputerModeFromSelectedProduct();
          }
        }
      },
      error: (err) => {
        console.error('Computer catalog load error:', err);
        this.computerProducts = [];
        this.loadingComputerProducts = false;
      }
    });
  }

  private createPcBuild(setupId: number): void {
    const pcName = this.buildName.trim();

    this.http.post<any>(`/api/setup/${setupId}/save-pcbuild`, {
      pc_name: pcName
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        const pcId = res?.pc?.id;
        if (pcId == null) {
          this.saving = false;
          this.error = 'PC build was created, but its id is missing.';
          return;
        }

        this.updatePcBuild(Number(pcId));
      },
      error: (err) => {
        console.error('PC build create error:', err);
        this.saving = false;
        this.error = 'Failed to create PC build.';
      }
    });
  }

  private saveReadyComputer(setupId: number): void {
    const product = this.getSelectedComputer();
    if (!product) {
      this.saving = false;
      this.error = this.mode === 'laptop' ? 'Válassz laptopot.' : 'Válassz egybegépet.';
      return;
    }

    const sourceTable = this.getProductSourceTable(product);
    const displayName = this.getComputerLabel(product);
    const productId = this.getId(product);
    if (productId == null) {
      this.saving = false;
      this.error = 'Hiányzik a termék azonosító.';
      return;
    }

    const request = this.editChildSetupId
      ? this.http.patch<any>(
          `/api/setup/replace-child-device/${this.editChildSetupId}`,
          { product_id: productId },
          { withCredentials: true }
        )
      : this.http.post<any>(
          `/api/setup/${setupId}/save-device`,
          {
            product_id: productId,
            source_table: sourceTable,
            display_name: displayName,
            manufacturer: this.getManufacturer(product)
          },
          { withCredentials: true }
        );

    request.subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Eszköz hozzáadva.';
        this.saved.emit();
      },
      error: (err) => {
        console.error('Ready computer save error:', err);
        this.saving = false;
        this.error = 'Nem sikerült hozzáadni a gépet.';
      }
    });
  }

  private tryPatchPcBuild(
    urls: string[],
    payload: any,
    onSuccess: () => void,
    index = 0
  ): void {
    if (index >= urls.length) {
      this.saving = false;
      this.error = 'Failed to save PC build.';
      console.error('❌ PC build update hiba: egyik endpoint sem működött.', urls);
      return;
    }

    const url = urls[index];

    this.http.patch(url, payload, { withCredentials: true }).subscribe({
      next: () => {
        onSuccess();
      },
      error: (err) => {
        const status = Number(err?.status ?? 0);

        if (status === 404) {
          console.warn(`⚠️ ${url} 404, következő PC update fallback jön.`);
          this.tryPatchPcBuild(urls, payload, onSuccess, index + 1);
          return;
        }

        console.error(`❌ PC build update error ezen az endpointon: ${url}`, err);
        this.saving = false;
        this.error = 'Failed to save PC build.';
      }
    });
  }

  private updatePcBuild(pcId: number): void {
    const payload = {
      processor_id: this.selectedProcessorId,
      motherboard_id: this.selectedMotherboardId,
      ram_id: this.selectedRamId,
      videocard_id: this.selectedGpuId,
      psu_id: this.selectedPsuId
    };

    const urls = [
      `/api/setup-update/save-pcbuild/${pcId}`,
      `/api/setup/save-pcbuild/${pcId}`
    ];

    this.tryPatchPcBuild(
      urls,
      payload,
      () => {
        this.saving = false;
        this.success = 'PC build saved successfully.';
        this.saved.emit();
      }
    );
  }

  getId(row: any): number | null {
    const id = row?.id ?? row?.ID ?? null;
    return id == null ? null : Number(id);
  }

  private getModel(row: any): string {
    return String(
      row?.model ??
      row?.Model ??
      row?.display_name ??
      ''
    ).trim();
  }

  private getManufacturer(row: any): string {
    return String(row?.manufacturer ?? row?.Manufacturer ?? '').trim();
  }

  getSocket(row: any): string {
    return this.normalizeSocket(row?.socket);
  }

  getRamType(row: any): string {
    return this.normalizeRamType(row?.ram_type);
  }

  getPrice(row: any): number | null {
    const value = row?.price ?? row?.Price ?? null;
    if (value == null || value === '') return null;

    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  setMode(mode: PcBuilderMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.error = '';
    this.success = '';
    this.selectedComputerId = null;
  }

  isBuildMode(): boolean {
    return this.mode === 'build';
  }

  isReadyComputerMode(): boolean {
    return this.mode === 'all_in_one' || this.mode === 'laptop';
  }

  getComputerLabel(product: any): string {
    const display = String(product?.display_name ?? '').trim();
    if (display) return display;

    const manufacturer = this.getManufacturer(product);
    const model = this.getModel(product);
    const name = String(product?.name ?? product?.product_name ?? product?.title ?? '').trim();
    return [manufacturer, model || name].filter(Boolean).join(' ') || 'Ismeretlen gép';
  }

  getComputerMeta(product: any): string {
    const category = String(product?.category ?? product?.type ?? product?.product_type ?? '').trim();
    const price = this.getPrice(product);
    return [category, price != null ? `${new Intl.NumberFormat('hu-HU').format(price)} Ft` : ''].filter(Boolean).join(' - ');
  }

  private getProductSourceTable(product: any): string {
    return String(
      product?.source_table ??
      product?.table_name ??
      product?.table ??
      product?.category ??
      'products'
    ).trim() || 'products';
  }

  private getProductCategory(product: any): string {
    return String(
      product?.category ??
      product?.Category ??
      product?.data?.category ??
      product?.data?.Category ??
      ''
    )
      .trim()
      .toLowerCase();
  }

  private getProductType(product: any): string {
    return String(
      product?.type ??
      product?.Type ??
      product?.product_type ??
      product?.productType ??
      product?.data?.type ??
      product?.data?.Type ??
      product?.data?.product_type ??
      product?.data?.productType ??
      ''
    )
      .trim()
      .toLowerCase();
  }

  private isLaptopProduct(product: any): boolean {
    // Requirement: products.category === 'laptop' AND products.type === 'pc'
    return this.getProductCategory(product) === 'laptop' && this.getProductType(product) === 'pc';
  }

  private isAllInOneProduct(product: any): boolean {
    // Requirement: products.category === 'desktop' AND products.type === 'pc'
    return this.getProductCategory(product) === 'desktop' && this.getProductType(product) === 'pc';
  }

  getVisibleComputerProducts(): any[] {
    const query = String(this.computerSearch || '').trim().toLowerCase();

    return this.computerProducts
      .filter((product) => this.mode === 'laptop' ? this.isLaptopProduct(product) : this.isAllInOneProduct(product))
      .filter((product) => !query || this.getComputerLabel(product).toLowerCase().includes(query))
      .slice(0, 120);
  }

  getSelectedComputer(): any | null {
    return this.computerProducts.find(product => this.getId(product) === this.selectedComputerId) ?? null;
  }

  getWattage(row: any): string {
    const value = row?.wattage ?? row?.Wattage ?? '';
    return String(value).trim();
  }

  getSelectedProcessor(): PcPart | null {
    return this.processors.find(p => this.getId(p) === this.selectedProcessorId) ?? null;
  }

  getSelectedMotherboard(): PcPart | null {
    return this.motherboards.find(m => this.getId(m) === this.selectedMotherboardId) ?? null;
  }

  canSelectMotherboard(): boolean {
    return !!this.getSelectedProcessor() && this.getCompatibleMotherboards().length > 0;
  }

  canSelectRam(): boolean {
    return !!this.getSelectedMotherboard() && this.getCompatibleRams().length > 0;
  }

  getVisibleMotherboards(): PcPart[] {
    return this.getCompatibleMotherboards();
  }

  isMotherboardCompatible(mb: PcPart, cpu: PcPart | null = this.getSelectedProcessor()): boolean {
    if (!cpu) return true;

    const cpuSocket = this.getSocket(cpu);
    const mbSocket = this.getSocket(mb);

    if (!cpuSocket || !mbSocket) {
      return false;
    }

    return mbSocket === cpuSocket;
  }

  getCompatibleMotherboards(): PcPart[] {
    const cpu = this.getSelectedProcessor();
    if (!cpu) return [];

    return this.motherboards.filter(mb => this.isMotherboardCompatible(mb, cpu));
  }

  getCompatibleRams(): PcPart[] {
    const cpu = this.getSelectedProcessor();
    const mb = this.getSelectedMotherboard();

    if (!cpu || !mb) return [];

    const cpuSocket = this.getSocket(cpu);
    const mbSocket = this.getSocket(mb);
    const mbRamType = this.getRamType(mb);

    if (!cpuSocket || !mbSocket || cpuSocket !== mbSocket) {
      return [];
    }

    if (!mbRamType) {
      return [];
    }

    return this.rams.filter(ram => {
      const ramType = this.getRamType(ram);
      return !!ramType && this.isRamCompatible(cpuSocket, mbRamType, ramType);
    });
  }

  getVisibleRams(): PcPart[] {
    return this.getCompatibleRams();
  }

  isRamVisibleCompatible(ram: PcPart): boolean {
    const cpu = this.getSelectedProcessor();
    const mb = this.getSelectedMotherboard();

    if (!cpu || !mb) {
      return true;
    }

    const cpuSocket = this.getSocket(cpu);
    const mbSocket = this.getSocket(mb);
    const mbRamType = this.getRamType(mb);
    const ramType = this.getRamType(ram);

    if (!cpuSocket || !mbSocket || cpuSocket !== mbSocket) {
      return false;
    }

    if (!mbRamType || !ramType) {
      return true;
    }

    return this.isRamCompatible(cpuSocket, mbRamType, ramType);
  }

  private isRamCompatible(cpuSocket: string, motherboardRamType: string, ramType: string): boolean {
    if (!motherboardRamType || !ramType) return false;

    const cpu = String(cpuSocket || '').toUpperCase();
    const boardRam = String(motherboardRamType || '').toUpperCase();
    const ram = String(ramType || '').toUpperCase();

    if (cpu === 'AM4') {
      return boardRam === 'DDR4' && ram === 'DDR4';
    }

    if (cpu === 'AM5') {
      return boardRam === 'DDR5' && ram === 'DDR5';
    }

    if (cpu === 'LGA1200') {
      return boardRam === 'DDR4' && ram === 'DDR4';
    }

    if (cpu === 'LGA1700') {
      return ram === boardRam && (ram === 'DDR4' || ram === 'DDR5');
    }

    return ram === boardRam;
  }

  onProcessorChange(): void {
    this.selectedMotherboardId = null;
    this.selectedRamId = null;
    this.success = '';
    this.error = '';
  }

  onMotherboardChange(): void {
    const compatibleRamIds = new Set(
      this.getCompatibleRams()
        .map(r => this.getId(r))
        .filter((id): id is number => id !== null)
    );

    if (this.selectedRamId != null && !compatibleRamIds.has(this.selectedRamId)) {
      this.selectedRamId = null;
    }

    this.success = '';
    this.error = '';
  }

  getProcessorLabel(cpu: PcPart): string {
    const displayName = String(cpu?.display_name ?? '').trim();
    if (displayName) return displayName;

    const manufacturer = this.getManufacturer(cpu);
    const model = this.getModel(cpu);
    const socket = this.getSocket(cpu);
    return [manufacturer, model, socket ? `(${socket})` : ''].filter(Boolean).join(' ');
  }

  getMotherboardLabel(mb: PcPart): string {
    const displayName = String(mb?.display_name ?? '').trim();
    if (displayName) return displayName;

    const manufacturer = this.getManufacturer(mb);
    const model = this.getModel(mb);
    const socket = this.getSocket(mb);
    const ramType = this.getRamType(mb);
    return [manufacturer, model, socket ? `(${socket})` : '', ramType ? `- ${ramType}` : '']
      .filter(Boolean)
      .join(' ');
  }

  getRamLabel(ram: PcPart): string {
    const displayName = String(ram?.display_name ?? '').trim();
    if (displayName) return displayName;

    const manufacturer = this.getManufacturer(ram);
    const model = this.getModel(ram);
    const ramType = this.getRamType(ram);
    return [manufacturer, model, ramType ? `(${ramType})` : ''].filter(Boolean).join(' ');
  }

  getGpuLabel(gpu: PcPart): string {
    const displayName = String(gpu?.display_name ?? '').trim();
    if (displayName) return displayName;

    const manufacturer = this.getManufacturer(gpu);
    const model = this.getModel(gpu);
    const price = this.getPrice(gpu);
    return [manufacturer, model, price != null ? `- ${price} Ft` : ''].filter(Boolean).join(' ');
  }

  getPsuLabel(psu: PcPart): string {
    const displayName = String(psu?.display_name ?? '').trim();
    if (displayName) return displayName;

    const manufacturer = this.getManufacturer(psu);
    const model = this.getModel(psu);
    const wattage = this.getWattage(psu);
    return [manufacturer, model, wattage ? `(${wattage}W)` : ''].filter(Boolean).join(' ');
  }

  saveBuild(): void {
    const sid = this.setupId();
    if (!sid) {
      this.error = 'Missing setup id.';
      return;
    }

    if (this.isReadyComputerMode()) {
      if (!this.selectedComputerId) {
        this.error = this.mode === 'laptop' ? 'Válassz laptopot.' : 'Válassz egybegépet.';
        return;
      }

      this.saving = true;
      this.error = '';
      this.success = '';
      this.saveReadyComputer(sid);
      return;
    }

    if (!this.selectedProcessorId) {
      this.error = 'Choose a processor first.';
      return;
    }

    if (!this.selectedMotherboardId) {
      this.error = 'Choose a compatible motherboard.';
      return;
    }

    const compatibleMotherboardIds = new Set(
      this.getCompatibleMotherboards()
        .map(mb => this.getId(mb))
        .filter((id): id is number => id !== null)
    );

    if (!compatibleMotherboardIds.has(this.selectedMotherboardId)) {
      this.error = 'The selected motherboard is not compatible with this processor.';
      return;
    }

    if (!this.selectedRamId) {
      this.error = 'Choose a compatible RAM.';
      return;
    }

    const compatibleRamIds = new Set(
      this.getCompatibleRams()
        .map(ram => this.getId(ram))
        .filter((id): id is number => id !== null)
    );

    if (!compatibleRamIds.has(this.selectedRamId)) {
      this.error = 'The selected RAM is not compatible with this processor and motherboard.';
      return;
    }

    if (!this.buildName.trim()) {
      this.error = 'A PC neve kötelező.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    // Edit existing PC build (child setup id), otherwise create new.
    if (this.editChildSetupId) {
      const pcId = Number(this.editChildSetupId);
      const nextName = this.buildName.trim();
      const payload = {
        processor_id: this.selectedProcessorId,
        motherboard_id: this.selectedMotherboardId,
        ram_id: this.selectedRamId,
        videocard_id: this.selectedGpuId,
        psu_id: this.selectedPsuId
      };

      const rename$ = this.http.patch<any>(
        '/api/setup/rename-item',
        { itemId: pcId, tableName: 'setups', newName: nextName },
        { withCredentials: true }
      );

      // Fire rename but don't block build update on it.
      rename$.subscribe({
        error: (err) => console.warn('PC rename failed (non-fatal):', err)
      });

      this.tryPatchPcBuild(
        [
          `/api/setup-update/save-pcbuild/${pcId}`,
          `/api/setup/save-pcbuild/${pcId}`
        ],
        payload,
        () => {
          this.saving = false;
          this.success = 'PC build saved successfully.';
          this.saved.emit();
        }
      );

      return;
    }

    this.createPcBuild(sid);
  }
}
