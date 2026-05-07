import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type PcPart = {
  id: number;
  slot: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' | 'other';
  source_table: string;
  display_name: string;
};

@Component({
  selector: 'app-setup-pc-builder-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './setup-pc-builder-modal.component.html',
  styleUrls: ['./setup-pc-builder-modal.component.css']
})
export class SetupPcBuilderModalComponent implements OnChanges {

  @Input() setup: any;
  @Input() pc: any;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  tab: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' = 'cpu';

  loadingParts = false;
  parts: PcPart[] = [];
  partsError = '';

  saving = false;
  errorMsg = '';

  cpuId: number | null = null;
  gpuId: number | null = null;
  motherboardId: number | null = null;
  ramId: number | null = null;
  psuId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.setup || !this.pc) return;

    this.cpuId = this.pc?.processor_id ?? null;
    this.gpuId = this.pc?.videocard_id ?? null;
    this.motherboardId = this.pc?.motherboard_id ?? null;
    this.ramId = this.pc?.ram_id ?? null;
    this.psuId = this.pc?.psu_id ?? null;

    if (changes['setup'] || changes['pc']) {
      this.loadParts();
    }
  }

  private loadParts(): void {
    const setupId = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    if (!setupId) return;

    this.loadingParts = true;
    this.partsError = '';
    this.parts = [];

    this.http.get<any>(`/api/setup/${setupId}/get-pcparts`, { withCredentials: true }).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.parts) ? res.parts : []);
        this.parts = Array.isArray(list) ? list : [];
        this.loadingParts = false;
      },
      error: (err) => {
        console.error('❌ pcparts hiba:', err);
        this.parts = [];
        this.loadingParts = false;
        this.partsError = 'Alkatrészek betöltése sikertelen.';
      }
    });
  }

  title(): string {
    return this.pc?.setup_name ?? 'PC összeállítás';
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  getOptions(slot: PcPart['slot']): PcPart[] {
    return (this.parts || []).filter(p => p.slot === slot);
  }

  save(): void {
    const pcId = this.pc?.id;
    if (!pcId) return;

    this.saving = true;
    this.errorMsg = '';

    const payload = {
      processor_id: this.cpuId,
      videocard_id: this.gpuId,
      motherboard_id: this.motherboardId,
      ram_id: this.ramId,
      psu_id: this.psuId
    };

    this.http.patch<any>(`/api/setup/save-pcbuild/${pcId}`, payload, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const updated = res?.pc ?? { ...this.pc, ...payload };
          this.saved.emit(updated);
          this.saving = false;
          this.close.emit();
        },
        error: (err) => {
          console.error('❌ pc build mentés hiba:', err);
          this.errorMsg = 'Mentés sikertelen.';
          this.saving = false;
        }
      });
  }
}
