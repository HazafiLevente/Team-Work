import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-instrument-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './instrument-builder-panel.component.html',
  styleUrls: ['./instrument-builder-panel.component.css']
})
export class InstrumentBuilderPanelComponent implements OnChanges {
  @Input() setup: any;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  instruments: any[] = [];
  selectedInstrumentKey = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.resetForm();
      this.loadInstrumentOptions();
    }
  }

  private resetForm(): void {
    this.selectedInstrumentKey = '';
    this.loading = false;
    this.saving = false;
    this.error = '';
    this.success = '';
  }

  private setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private unwrapInstruments(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.instruments)) return res.instruments;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.products)) return res.products;
    return [];
  }

  public getInstrumentKey(inst: any): string {
    return String(inst?.id ?? inst?.ID ?? '');
  }

  private parseInstrumentKey(key: string): number | null {
    const parsedId = key == null || key === '' ? null : Number(key);
    return parsedId == null || Number.isNaN(parsedId) ? null : parsedId;
  }

  loadInstrumentOptions(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    // Az API-nak szűrnie kell a type='inst' oszlopra a products táblában
    this.http.get<any>('/api/setup/instrument-options', { withCredentials: true }).subscribe({
      next: (res) => {
        this.instruments = this.unwrapInstruments(res).map((inst: any) => ({
          ...inst,
          __instKey: this.getInstrumentKey(inst)
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ instrument options load error:', err);
        this.error = 'Nem sikerült betölteni a hangszerlistát.';
        this.loading = false;
      }
    });
  }

  getSelectedInstrument(): any | null {
    if (!this.selectedInstrumentKey) return null;
    return this.instruments.find(inst => inst.__instKey === this.selectedInstrumentKey) ?? null;
  }

  getInstrumentLabel(inst: any): string {
    return String(
      inst?.name ??
      inst?.display_name ??
      `Hangszer #${inst?.id ?? '?'}`
    ).trim();
  }

  trackInstrument(_: number, inst: any): string {
    return inst?.__instKey ?? this.getInstrumentKey(inst);
  }

  saveInstrument(): void {
    const sid = this.setupId();
    if (!sid) {
      this.error = 'Hiányzik a setup azonosító.';
      return;
    }

    const instId = this.parseInstrumentKey(this.selectedInstrumentKey);
    if (instId == null) {
      this.error = 'Válassz egy hangszert.';
      return;
    }

    const selected = this.getSelectedInstrument();
    if (!selected) {
      this.error = 'A kiválasztott hangszer nem található.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload = {
      instrument_id: instId,
      type: 'inst'
    };

    this.http.post<any>(`/api/setup/${sid}/add-instrument`, payload, { withCredentials: true }).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Hangszer sikeresen hozzáadva.';
        this.saved.emit();
      },
      error: (err) => {
        console.error('❌ instrument add error:', err);
        this.saving = false;
        this.error = 'Nem sikerült hozzáadni a hangszert.';
      }
    });
  }
}
