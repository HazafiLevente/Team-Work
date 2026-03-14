import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-setup-pc-part-details-panel',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './setup-pc-part-details-panel.component.html',
  styleUrls: ['./setup-pc-part-details-panel.component.css']
})
export class SetupPcPartDetailsPanelComponent implements OnChanges {
  @Input() partItem: any;
  @Output() close = new EventEmitter<void>();

  loading = false;
  error = '';
  details: any = null;

  panelX = 24;
  panelY = 110;
  dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partItem'] && this.partItem) {
      this.loadDetails();
    }
  }

  private loadDetails(): void {
    const table = String(
      this.partItem?.source_table ??
      this.partItem?.table_name ??
      this.partItem?.table ??
      ''
    ).trim();

    const normalizedTable = table.toLowerCase().replace(/\s+/g, '_');

    const id =
      this.partItem?.part_id ??
      this.partItem?.item_id ??
      this.partItem?.product_id ??
      this.partItem?.id ??
      null;

    this.loading = true;
    this.error = '';
    this.details = null;

    if (id == null) {
      this.details = this.partItem ?? {};
      this.loading = false;
      return;
    }

    // Ha setup-szintű gyűjtő tábla neve jön, ne próbáljunk hibás fetch-et.
    if (
      !table ||
      normalizedTable === 'pc_details' ||
      normalizedTable === 'pc-details' ||
      normalizedTable.includes('pc_details[setup]') ||
      normalizedTable.includes('pc-details[setup]')
    ) {
      this.details = this.partItem ?? {};
      this.loading = false;
      return;
    }

    this.http.get<any>(`/api/items/${table}/${id}`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.details = res?.item ?? res?.product ?? res?.data ?? res ?? this.partItem ?? {};
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ PC alkatrész betöltési hiba:', err);
        this.details = this.partItem ?? {};
        this.error = '';
        this.loading = false;
      }
    });
  }

  title(): string {
    return (
      this.partItem?.display_name ??
      this.partItem?.name ??
      this.partItem?.model ??
      'PC alkatrész'
    );
  }

  subtitle(): string {
    const slot = String(this.partItem?.slot ?? '').toLowerCase();

    switch (slot) {
      case 'cpu': return 'Processzor adatok';
      case 'gpu': return 'Videókártya adatok';
      case 'motherboard': return 'Alaplap adatok';
      case 'ram': return 'RAM adatok';
      case 'psu': return 'Táp adatok';
      default: return 'PC alkatrész adatok';
    }
  }

  private slotLabel(slot: string): string {
    switch (slot) {
      case 'cpu': return 'Processzor';
      case 'gpu': return 'Videókártya';
      case 'motherboard': return 'Alaplap';
      case 'ram': return 'RAM';
      case 'psu': return 'Táp';
      default: return 'Típus';
    }
  }

  private keyLabel(key: string): string {
    const map: Record<string, string> = {
      manufacturer: 'Gyártó',
      brand: 'Márka',
      model: 'Modell',
      chipset: 'Chipset',
      socket: 'Socket',
      capacity: 'Kapacitás',
      memory: 'Memória',
      memory_type: 'Memória típus',
      speed: 'Sebesség',
      clock: 'Órajel',
      boost_clock: 'Boost órajel',
      base_clock: 'Alap órajel',
      wattage: 'Teljesítmény',
      power: 'Teljesítmény',
      tdp: 'TDP',
      vram: 'VRAM',
      price: 'Ár'
    };

    return map[key] ?? key;
  }

  visibleRows(): Array<{ label: string; value: string }> {
    const base: Array<{ label: string; value: string }> = [];

    const slot = String(this.partItem?.slot ?? '').toLowerCase();
    if (slot) {
      base.push({
        label: 'Elem típusa',
        value: this.slotLabel(slot)
      });
    }

    const displayName =
      this.partItem?.display_name ??
      this.partItem?.name ??
      this.partItem?.model ??
      '';

    if (displayName) {
      base.push({
        label: 'Név',
        value: displayName
      });
    }

    const src =
      this.partItem?.source_table ??
      this.partItem?.table_name ??
      this.partItem?.table ??
      '';

    if (src && src !== 'pc_details' && src !== 'pc-details') {
      base.push({
        label: 'Forrás',
        value: String(src)
      });
    }

    const detailRows =
      this.details && typeof this.details === 'object'
        ? Object.entries(this.details)
          .filter(([key, value]) => {
            const blocked = new Set([
              'id',
              'setup_id',
              'created_at',
              'updated_at',
              'image',
              'image_url',
              'img',
              'thumbnail',
              'description',
              'display_name',
              'name',
              'slot',
              'source_table',
              'table_name',
              'table',
              'category'
            ]);

            if (blocked.has(key)) return false;
            if (value == null) return false;
            if (typeof value === 'object') return false;
            if (String(value).trim() === '') return false;
            return true;
          })
          .slice(0, 8)
          .map(([key, value]) => ({
            label: this.keyLabel(key),
            value: String(value)
          }))
        : [];

    return [...base, ...detailRows];
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  startDrag(event: MouseEvent): void {
    this.dragging = true;
    this.dragOffsetX = event.clientX - this.panelX;
    this.dragOffsetY = event.clientY - this.panelY;
    event.preventDefault();
  }

  onDrag(event: MouseEvent): void {
    if (!this.dragging) return;

    this.panelX = event.clientX - this.dragOffsetX;
    this.panelY = event.clientY - this.dragOffsetY;

    if (this.panelX < 0) this.panelX = 0;
    if (this.panelY < 0) this.panelY = 0;
  }

  stopDrag(): void {
    this.dragging = false;
  }
}
