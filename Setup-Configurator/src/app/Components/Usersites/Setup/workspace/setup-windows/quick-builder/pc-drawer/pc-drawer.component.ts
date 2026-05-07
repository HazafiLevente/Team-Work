import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';

type PcPart = {
  id: number;
  slot: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' | 'other';
  source_table: string;
  display_name: string;
};

@Component({
  selector: 'app-pc-drawer',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './pc-drawer.component.html',
  styleUrls: ['./pc-drawer.component.css']
})
export class PcDrawerComponent implements OnChanges {
  @Input() pc: any;

  @Input() parts: PcPart[] = [];
  @Input() partsLoading = false;
  @Input() partsError = '';

  @Output() close = new EventEmitter<void>();

  private map: Record<string, Map<string, string>> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parts']) {
      this.rebuildMap();
    }
  }

  private rebuildMap(): void {
    const m: Record<string, Map<string, string>> = {};
    for (const p of (this.parts || [])) {
      const slot = p?.slot ?? 'other';
      const id = p?.id;
      const name = p?.display_name;
      if (id == null) continue;
      if (!m[slot]) m[slot] = new Map<string, string>();
      m[slot].set(String(id), String(name || `#${id}`));
    }
    this.map = m;
  }

  private lookup(slot: PcPart['slot'], id: any): string {
    if (id == null) return '—';
    const bySlot = this.map?.[slot];
    const hit = bySlot?.get(String(id));
    return hit || `#${id}`;
  }

  cpuName(): string {
    return this.lookup('cpu', this.pc?.processor_id);
  }
  gpuName(): string {
    return this.lookup('gpu', this.pc?.videocard_id);
  }
  motherboardName(): string {
    return this.lookup('motherboard', this.pc?.motherboard_id);
  }
  ramName(): string {
    return this.lookup('ram', this.pc?.ram_id);
  }
  psuName(): string {
    return this.lookup('psu', this.pc?.psu_id);
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  title(): string {
    return this.pc?.setup_name ?? this.pc?.pc_name ?? 'PC';
  }
}
