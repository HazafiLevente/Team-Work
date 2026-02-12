import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SetupPcBuilderModalComponent } from '../setup-pc-builder-modal/setup-pc-builder-modal.component';

type UiItem = {
  category: string;
  display_name: string;
  manufacturer?: string;
};

type PcBuildRow = any;

@Component({
  selector: 'app-setup-tools-modal',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, SetupPcBuilderModalComponent],
  templateUrl: './setup-tools-modal.component.html',
  styleUrls: ['./setup-tools-modal.component.css']
})
export class SetupToolsModalComponent implements OnChanges {

  @Input() setup: any;

  // opcionális: ha a jobbklikk menüből a PC füllel akarod nyitni
  @Input() startTab: 'items' | 'pc' = 'items';

  @Output() close = new EventEmitter<void>();

  tab: 'items' | 'pc' = 'items';

  // items
  loading = false;
  items: UiItem[] = [];
  errorMsg = '';

  // pc builds
  pcLoading = false;
  pcs: PcBuildRow[] = [];
  pcError = '';

  pcCreateName = '';
  pcCreateSaving = false;
  pcCreateError = '';

  // pc builder modal
  pcBuilderOpen = false;
  pcBuilderRow: any = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['setup']) return;
    if (!this.setup) return;

    this.tab = this.startTab ?? 'items';

    this.loadItems();
    this.loadPcBuilds();
  }

  private loadItems(): void {
    const setupId = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    if (!setupId) return;

    this.loading = true;
    this.items = [];
    this.errorMsg = '';

    this.http.get<UiItem[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.items = Array.isArray(items) ? items : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Tools modal children hiba:', err);
          this.items = [];
          this.loading = false;
          this.errorMsg = 'Betöltés sikertelen.';
        }
      });
  }

  private loadPcBuilds(): void {
    const setupId = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    if (!setupId) return;

    this.pcLoading = true;
    this.pcs = [];
    this.pcError = '';

    this.http.get<any>(`/api/setup/${setupId}/pcbuilds`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const list = res?.pcs;
          this.pcs = Array.isArray(list) ? list : [];
          this.pcLoading = false;
        },
        error: (err) => {
          console.error('❌ pcbuilds hiba:', err);
          this.pcs = [];
          this.pcLoading = false;
          this.pcError = 'PC-k betöltése sikertelen.';
        }
      });
  }

  title(): string {
    return this.setup?.setup_name ?? this.setup?.name ?? 'Névtelen setup';
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  // ---------- PC create ----------
  createPc(): void {
    const setupId = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    if (!setupId) return;

    const pc_name = (this.pcCreateName || '').trim();
    if (!pc_name) {
      this.pcCreateError = 'Adj nevet a PC-nek.';
      return;
    }

    this.pcCreateSaving = true;
    this.pcCreateError = '';

    this.http.post<any>(`/api/setup/${setupId}/pcbuilds`, { pc_name }, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const created = res?.pc;
          if (created) this.pcs = [created, ...this.pcs];
          this.pcCreateName = '';
          this.pcCreateSaving = false;
        },
        error: (err) => {
          console.error('❌ pc create hiba:', err);
          this.pcCreateError = 'Létrehozás sikertelen.';
          this.pcCreateSaving = false;
        }
      });
  }

  openPcBuilder(pc: any): void {
    this.pcBuilderRow = pc;
    this.pcBuilderOpen = true;
  }

  closePcBuilder(): void {
    this.pcBuilderOpen = false;
    this.pcBuilderRow = null;
  }

  onPcSaved(updatedPc: any): void {
    const id = updatedPc?.id;
    if (!id) return;

    this.pcs = this.pcs.map(p => (p?.id === id ? { ...p, ...updatedPc } : p));
  }
}
