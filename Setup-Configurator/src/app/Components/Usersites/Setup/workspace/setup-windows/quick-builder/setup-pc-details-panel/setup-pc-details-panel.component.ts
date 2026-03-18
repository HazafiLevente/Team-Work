import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type PcPart = {
  id: number;
  slot: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' | 'other';
  source_table: string;
  display_name: string;
};

@Component({
  selector: 'app-setup-pc-details-panel',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './setup-pc-details-panel.component.html',
  styleUrls: ['./setup-pc-details-panel.component.css']
})
export class SetupPcDetailsPanelComponent implements OnChanges {
  @Input() pcItem: any;
  @Output() close = new EventEmitter<void>();

  @ViewChild('panelEl', { static: false }) panelEl?: ElementRef<HTMLElement>;

  loadingParts = false;
  parts: PcPart[] = [];
  partsError = '';

  cpuId: number | null = null;
  gpuId: number | null = null;
  motherboardId: number | null = null;
  ramId: number | null = null;
  psuId: number | null = null;

  private map: Record<string, Map<string, string>> = {};

  panelX = 24;
  panelY = 110;
  dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.pcItem) return;

    this.cpuId = this.pcItem?.processor_id ?? null;
    this.gpuId = this.pcItem?.videocard_id ?? null;
    this.motherboardId = this.pcItem?.motherboard_id ?? null;
    this.ramId = this.pcItem?.ram_id ?? null;
    this.psuId = this.pcItem?.psu_id ?? null;

    if (changes['pcItem']) {
      this.loadParts();
    }
  }

  private loadParts(): void {
    const setupId =
      this.pcItem?.setup_id ??
      this.pcItem?.setupId ??
      this.pcItem?.id;

    if (!setupId) {
      this.parts = [];
      this.partsError = 'Hiányzó setup azonosító.';
      return;
    }

    this.loadingParts = true;
    this.partsError = '';
    this.parts = [];
    this.map = {};

    this.http.get<any>(`/api/setup/${setupId}/get-pcparts`, { withCredentials: true }).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.parts) ? res.parts : []);
        this.parts = Array.isArray(list) ? list : [];
        this.rebuildMap();
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

  private rebuildMap(): void {
    const m: Record<string, Map<string, string>> = {};

    for (const p of this.parts || []) {
      const slot = String(p?.slot ?? '').toLowerCase();
      if (!slot) continue;

      if (!m[slot]) {
        m[slot] = new Map<string, string>();
      }

      m[slot].set(String(p.id), p.display_name ?? `#${p.id}`);
    }

    this.map = m;
  }

  private lookup(slot: string, id: number | null | undefined): string {
    if (id == null) return 'Nincs kiválasztva';
    const bySlot = this.map[slot];
    const hit = bySlot?.get(String(id));
    return hit || `#${id}`;
  }

  cpuName(): string {
    return this.lookup('cpu', this.cpuId);
  }

  gpuName(): string {
    return this.lookup('gpu', this.gpuId);
  }

  motherboardName(): string {
    return this.lookup('motherboard', this.motherboardId);
  }

  ramName(): string {
    return this.lookup('ram', this.ramId);
  }

  psuName(): string {
    return this.lookup('psu', this.psuId);
  }

  title(): string {
    return this.pcItem?.setup_name ?? this.pcItem?.pc_name ?? this.pcItem?.display_name ?? 'PC';
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  startDrag(event: MouseEvent): void {
    const boundary = document.querySelector('.setup-workspace .boundary-area') as HTMLElement | null;
    const boundaryRect = boundary?.getBoundingClientRect();

    if (boundaryRect) {
      const localMouseX = event.clientX - boundaryRect.left;
      const localMouseY = event.clientY - boundaryRect.top;
      this.dragOffsetX = localMouseX - this.panelX;
      this.dragOffsetY = localMouseY - this.panelY;
    } else {
      this.dragOffsetX = event.clientX - this.panelX;
      this.dragOffsetY = event.clientY - this.panelY;
    }

    this.dragging = true;
    event.preventDefault();
  }

  onDrag(event: MouseEvent): void {
    if (!this.dragging) return;

    const boundary = document.querySelector('.setup-workspace .boundary-area') as HTMLElement | null;
    const boundaryRect = boundary?.getBoundingClientRect();
    const panelRect = this.panelEl?.nativeElement.getBoundingClientRect();

    if (!boundaryRect) return;

    const panelWidth = panelRect?.width ?? 360;
    const panelHeight = panelRect?.height ?? 520;

    const localMouseX = event.clientX - boundaryRect.left;
    const localMouseY = event.clientY - boundaryRect.top;

    const nextX = localMouseX - this.dragOffsetX;
    const nextY = localMouseY - this.dragOffsetY;

    const maxX = Math.max(0, boundaryRect.width - panelWidth - 8);
    const maxY = Math.max(0, boundaryRect.height - panelHeight - 8);

    this.panelX = Math.min(Math.max(0, nextX), maxX);
    this.panelY = Math.min(Math.max(0, nextY), maxY);
  }

  stopDrag(): void {
    this.dragging = false;
  }
}
