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

@Component({
  selector: 'app-pc-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pc-builder-panel.component.html',
  styleUrls: ['./pc-builder-panel.component.css']
})
export class PcBuilderPanelComponent implements OnChanges {
  @Input() setup: any;
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

  selectedProcessorId: number | null = null;
  selectedMotherboardId: number | null = null;
  selectedRamId: number | null = null;
  selectedGpuId: number | null = null;
  selectedPsuId: number | null = null;

  buildName = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.resetSelections();
      this.loadAllParts();
    }
  }

  private resetSelections(): void {
    this.selectedProcessorId = null;
    this.selectedMotherboardId = null;
    this.selectedRamId = null;
    this.selectedGpuId = null;
    this.selectedPsuId = null;
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
    const v = String(value ?? '').trim().toUpperCase();
    if (!v) return '';
    return v.replace(/\s+/g, '').replace(/SOCKET/g, '');
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
    return !!this.getSelectedProcessor();
  }

  canSelectRam(): boolean {
    return !!this.getSelectedProcessor() && !!this.getSelectedMotherboard();
  }

  getCompatibleMotherboards(): PcPart[] {
    const cpu = this.getSelectedProcessor();
    if (!cpu) return [];

    const cpuSocket = this.getSocket(cpu);
    if (!cpuSocket) return [];

    return this.motherboards.filter(mb => {
      const mbSocket = this.getSocket(mb);
      return !!mbSocket && mbSocket === cpuSocket;
    });
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

    return this.rams.filter(ram =>
      this.isRamCompatible(cpuSocket, mbRamType, this.getRamType(ram))
    );
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

    if (!this.selectedProcessorId) {
      this.error = 'Choose a processor first.';
      return;
    }

    if (!this.selectedMotherboardId) {
      this.error = 'Choose a compatible motherboard.';
      return;
    }

    if (!this.selectedRamId) {
      this.error = 'Choose a compatible RAM.';
      return;
    }

    if (!this.buildName.trim()) {
      this.error = 'A PC neve kötelező.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    this.createPcBuild(sid);
  }
}
