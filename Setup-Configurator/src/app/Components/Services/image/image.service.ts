import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {

  private map: any = null;

  async load() {
    if (this.map) return;

    const res = await fetch('/api/images');
    if (!res.ok) {
      console.warn('❌ /api/images not reachable');
      this.map = {};
      return;
    }

    this.map = await res.json();
    console.log('🖼 IMAGE MAP LOADED (Angular):', this.map);
  }

  getImage(table: string, product: any): string {
    if (!this.map || !table) {
      return this.fallback();
    }

    const category = this.normalizeTable(table);
    const rules = this.map[category];

    if (!rules) {
      return this.fallback();
    }

    const text = this.normalize(
      `${product.manufacturer || ''} ${product.model || ''}`
    );

    for (const [key, url] of Object.entries(rules)) {
      if (text.includes(this.normalize(key))) {
        return url as string;
      }
    }

    // kategória fallback
    const first = Object.values(rules)[0];
    return (first as string) || this.fallback();
  }

  private fallback() {
    return 'https://via.placeholder.com/200?text=No+Image';
  }

  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private normalizeTable(table: string): string {
    return table
      .toLowerCase()
      .replace('public.', '')
      .replace(/[_\s]+/g, '_')
      .trim();
  }
}
