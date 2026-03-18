import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-pc-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pc-builder-panel.component.html',
  styleUrls: ['./pc-builder-panel.component.css']
})
export class PcBuilderPanelComponent implements OnChanges {
  @Input() setup: any;

  loading = false;
  saving = false;
  error = '';
  success = '';

  processors: any[] = [];
  motherboards: any[] = [];
  rams: any[] = [];
  gpus: any[] = [];
  psus: any[] = [];

  selectedProcessorId: number | null = null;
  selectedMotherboardId: number | null = null;
  selectedRamId: number | null = null;
  selectedGpuId: number | null = null;
  selectedPsuId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.loadAllParts();
      this.resetSelections();
    }
  }

  private resetSelections(): void {
    this.selectedProcessorId = null;
    this.selectedMotherboardId = null;
    this.selectedRamId = null;
    this.selectedGpuId = null;
    this.selectedPsuId = null;
    this.error = '';
    this.success = '';
  }

  private setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private loadAllParts(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    Promise.all([
      this.http.get<any[]>('/api/processors', { withCredentials: true }).toPromise(),
      this.http.get<any[]>('/api/motherboards', { withCredentials: true }).toPromise(),
      this.http.get<any[]>('/api/rams', { withCredentials: true }).toPromise(),
      this.http.get<any[]>('/api/videocards', { withCredentials: true }).toPromise(),
      this.http.get<any[]>('/api/psus', { withCredentials: true }).toPromise()
    ])
      .then(([processors, motherboards, rams, gpus, psus]) => {
        this.processors = this.unwrapArray(processors);
        this.motherboards = this.unwrapArray(motherboards);
        this.rams = this.unwrapArray(rams);
        this.gpus = this.unwrapArray(gpus);
        this.psus = this.unwrapArray(psus);
        this.loading = false;
      })
      .catch((err) => {
        console.error('PC builder load error:', err);
        this.error = 'Failed to load PC parts.';
        this.loading = false;
      });
  }

  private unwrapArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
  }

  getId(row: any): number | null {
    const id = row?.id ?? row?.ID ?? null;
    return id == null ? null : Number(id);
  }

  private getModel(row: any): string {
    return String(row?.model ?? row?.Model ?? '').trim();
  }

  private getManufacturer(row: any): string {
    return String(row?.manufacturer ?? row?.Manufacturer ?? '').trim();
  }

  getSocket(row: any): string {
    return String(row?.socket ?? row?.Socket ?? '').trim().toUpperCase();
  }

  getRamType(row: any): string {
    return String(
      row?.ram_type ??
      row?.ramtype ??
      row?.RamType ??
      row?.RAMType ??
      ''
    ).trim().toUpperCase();
  }

  getPrice(row: any): number | null {
    const value = row?.price ?? row?.Price ?? null;
    return value == null ? null : Number(value);
  }

  getWattage(row: any): string {
    const value = row?.wattage ?? row?.Wattage ?? '';
    return String(value).trim();
  }

  getSelectedProcessor(): any | null {
    return this.processors.find(p => this.getId(p) === this.selectedProcessorId) ?? null;
  }

  getSelectedMotherboard(): any | null {
    return this.motherboards.find(m => this.getId(m) === this.selectedMotherboardId) ?? null;
  }

  canSelectMotherboard(): boolean {
    return !!this.getSelectedProcessor();
  }

  canSelectRam(): boolean {
    return !!this.getSelectedProcessor() && !!this.getSelectedMotherboard();
  }

  getCompatibleMotherboards(): any[] {
    const cpu = this.getSelectedProcessor();
    if (!cpu) return [];

    const cpuSocket = this.getSocket(cpu);
    if (!cpuSocket) return [];

    return this.motherboards.filter(mb => this.getSocket(mb) === cpuSocket);
  }

  getCompatibleRams(): any[] {
    const cpu = this.getSelectedProcessor();
    const mb = this.getSelectedMotherboard();

    if (!cpu || !mb) return [];

    const cpuSocket = this.getSocket(cpu);
    const mbSocket = this.getSocket(mb);
    const mbRamType = this.getRamType(mb);

    if (!cpuSocket || !mbSocket || cpuSocket !== mbSocket) {
      return [];
    }

    return this.rams.filter(ram => this.isRamCompatible(cpuSocket, mbRamType, this.getRamType(ram)));
  }

  private isRamCompatible(cpuSocket: string, motherboardRamType: string, ramType: string): boolean {
    if (!cpuSocket || !motherboardRamType || !ramType) return false;

    if (cpuSocket === 'AM4') {
      return motherboardRamType === 'DDR4' && ramType === 'DDR4';
    }

    if (cpuSocket === 'AM5') {
      return motherboardRamType === 'DDR5' && ramType === 'DDR5';
    }

    if (cpuSocket === 'LGA1200') {
      return motherboardRamType === 'DDR4' && ramType === 'DDR4';
    }

    if (cpuSocket === 'LGA1700') {
      return ramType === motherboardRamType && (ramType === 'DDR4' || ramType === 'DDR5');
    }

    return ramType === motherboardRamType;
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

    if (
      this.selectedRamId != null &&
      !compatibleRamIds.has(this.selectedRamId)
    ) {
      this.selectedRamId = null;
    }

    this.success = '';
    this.error = '';
  }

  getProcessorLabel(cpu: any): string {
    const manufacturer = this.getManufacturer(cpu);
    const model = this.getModel(cpu);
    const socket = this.getSocket(cpu);
    return [manufacturer, model, socket ? `(${socket})` : ''].filter(Boolean).join(' ');
  }

  getMotherboardLabel(mb: any): string {
    const manufacturer = this.getManufacturer(mb);
    const model = this.getModel(mb);
    const socket = this.getSocket(mb);
    const ramType = this.getRamType(mb);
    return [manufacturer, model, socket ? `(${socket})` : '', ramType ? `- ${ramType}` : '']
      .filter(Boolean)
      .join(' ');
  }

  getRamLabel(ram: any): string {
    const manufacturer = this.getManufacturer(ram);
    const model = this.getModel(ram);
    const ramType = this.getRamType(ram);
    return [manufacturer, model, ramType ? `(${ramType})` : ''].filter(Boolean).join(' ');
  }

  getGpuLabel(gpu: any): string {
    const manufacturer = this.getManufacturer(gpu);
    const model = this.getModel(gpu);
    const price = this.getPrice(gpu);
    return [manufacturer, model, price != null ? `- ${price} Ft` : ''].filter(Boolean).join(' ');
  }

  getPsuLabel(psu: any): string {
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

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload = {
      processor_id: this.selectedProcessorId,
      motherboard_id: this.selectedMotherboardId,
      ram_id: this.selectedRamId,
      videocard_id: this.selectedGpuId,
      psu_id: this.selectedPsuId
    };

    this.http.post(`/api/setup/${sid}/save-pcbuild`, payload, { withCredentials: true }).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'PC build saved successfully.';
      },
      error: (err) => {
        console.error('PC build save error:', err);
        this.saving = false;
        this.error = 'Failed to save PC build.';
      }
    });
  }
}
