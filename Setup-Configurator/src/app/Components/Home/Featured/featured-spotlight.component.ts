import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { CardSwapComponent } from '../../Shared/CardSwap/card-swap.component';
import { ImageService } from '../../Services/image/image.service';

type AnyProduct = any;

@Component({
  selector: 'app-featured-spotlight',
  standalone: true,
  imports: [CommonModule, CardSwapComponent],
  templateUrl: './featured-spotlight.component.html',
  styleUrls: ['./featured-spotlight.component.css']

})
export class FeaturedSpotlightComponent implements OnChanges {
  @Input() products: AnyProduct[] = [];
  @Output() openProduct = new EventEmitter<AnyProduct>();

  images: string[] = [];
  cards: AnyProduct[] = [];

  activeIndex = 0;

  constructor(private imagesSvc: ImageService) {}

  // ✅ HTML ezt használja: *ngIf="current as p"
  get current(): AnyProduct | null {
    return this.cards?.[this.activeIndex] ?? null;
  }

  async ngOnChanges(ch: SimpleChanges) {
    if (ch['products']) {
      await this.imagesSvc.load();
      this.buildCards();
    }
  }

  // ✅ CardSwap kattintás -> nyissa a details panelt
  onCardClick(idx: number) {
    const p = this.cards[idx];
    if (p) this.openProduct.emit(p);
  }

  // ✅ CardSwap váltás -> frissüljön a current + specs
  onActiveChanged(idx: number) {
    this.activeIndex = idx;
  }

  private buildCards() {
    const src = this.products || [];
    if (!src.length) {
      this.cards = [];
      this.images = [];
      this.activeIndex = 0;
      return;
    }

    const picked = this.pickRandomUnique(src, 6);
    this.cards = picked;

    this.images = picked.map(p => {
      const table = (p as any).table_name ?? (p as any).table ?? '';
      return this.imagesSvc.getImage(table, p);
    });

    this.activeIndex = 0;
  }

  private pickRandomUnique(arr: AnyProduct[], n: number): AnyProduct[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  formatPrice(v: any): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'N/A';
    return new Intl.NumberFormat('hu-HU').format(n) + ' Ft';
  }

  specs(p: AnyProduct): Array<{ k: string; v: any }> {
    const d = p?.data;
    if (!d || typeof d !== 'object') return [];

    const hidden = new Set(['id', 'created_at', 'updated_at']);
    return Object.entries(d)
      .filter(([k]) => !hidden.has(String(k).toLowerCase()))
      .filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .slice(0, 5)
      .map(([k, v]) => ({ k, v }));
  }
}
