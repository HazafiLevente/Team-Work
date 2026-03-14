import { Injectable } from '@angular/core';

type ImageMap = Record<string, Record<string, string[]>>;

@Injectable({ providedIn: 'root' })
export class ImageService {
  private map: ImageMap | null = null;

  async load() {
    if (this.map) return;

    const res = await fetch('/api/images/map');
    if (!res.ok) {
      console.warn('❌ /api/images/map not reachable');
      this.map = {};
      return;
    }

    const json = await res.json();
    this.map = json as ImageMap;

    console.log('🖼 IMAGE MAP LOADED:', this.map);
  }

  getImages(table: string, product: any): string[] {
    if (!this.map || !table || !product) return [];

    const tableKey = this.normalizeTable(table);
    const id = String(
      product.id ??
      product.ID ??
      product?.data?.id ??
      product?.data?.ID ??
      ''
    ).trim();

    if (!id) return [];

    return this.map?.[tableKey]?.[id] ?? [];
  }

  getImage(table: string, product: any): string {
    const images = this.getImages(table, product);
    return images[0] || this.fallback();
  }

  private fallback() {
    return 'https://via.placeholder.com/200?text=No+Image';
  }

  private normalizeTable(table: string): string {
    return String(table || '')
      .toLowerCase()
      .replace('public.', '')
      .replace(/[_\s]+/g, '_')
      .trim();
  }
}
