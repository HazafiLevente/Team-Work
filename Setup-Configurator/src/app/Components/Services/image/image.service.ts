import { Injectable } from '@angular/core';

type ImageMap = Record<string, Record<string, string[]>>;

@Injectable({ providedIn: 'root' })
export class ImageService {
  private map: ImageMap | null = null;

  async load() {
    if (this.map) return;

    const res = await fetch('/api/images/map?preview=1');
    if (!res.ok) {
      console.warn('❌ /api/images/map not reachable');
      this.map = {};
      return;
    }

    const json = await res.json();
    this.map = json as ImageMap;

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

  getImage(table: string, product: any, width = 320): string {
    const images = this.getImages(table, product);
    return images[0] ? this.previewUrl(images[0], width) : this.fallback();
  }

  getOriginalImage(table: string, product: any): string {
    const images = this.getImages(table, product);
    return images[0] || '';
  }

  private fallback() {
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22/%3E';
  }

  private normalizeTable(table: string): string {
    return String(table || '')
      .toLowerCase()
      .replace('public.', '')
      .replace(/[_\s]+/g, '_')
      .trim();
  }

  private previewUrl(url: string, width: number): string {
    if (!url.startsWith('/images/')) return url;

    const previewWidth = Math.max(96, Math.min(900, Math.round(width || 320)));
    return `/image-preview/${url.slice('/images/'.length)}?w=${previewWidth}`;
  }
}
