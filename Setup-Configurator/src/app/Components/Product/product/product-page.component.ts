import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';
import { ProductGalleryComponent } from '../productgallery/product-gallery.component';
import { HttpClient } from '@angular/common/http';

type ImageMap = Record<string, Record<string, string[]>>;

@Component({
  selector: 'app-product-site-page',
  standalone: true,
  imports: [CommonModule, ProductGalleryComponent],
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.css']
})
export class ProductPageComponent implements OnInit {

  loading = true;
  error: string | null = null;

  item: any = null;

  table = '';
  id = '';

  primary = {
    manufacturer: '',
    model: '',
    category: '',
    description: ''
  };

  fields: Array<{ label: string; value: string }> = [];
  imageUrls: string[] = [];

  private static imageMapCache: ImageMap | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private http: HttpClient
  ) {}

  userRole: string | null = null;

  get displayTitle(): string {
    return this.primary.model || 'Ismeretlen termék';
  }

  get displaySubtitle(): string {
    return this.primary.manufacturer || '';
  }

  get displayPrice(): string | null {
    const n = this.parsePrice(
      this.item?.price ??
      this.item?.Price ??
      this.item?.price_range ??
      this.item?.['Price Range (Ft)'] ??
      null
    );
    if (n == null) return null;
    return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const table = params.get('table');
      const id = params.get('id');

      this.http.get<any>('/api/profile', { withCredentials: true })
        .subscribe({
          next: (res) => {
            this.userRole = res?.role ?? null;
          },
          error: () => {
            this.userRole = null;
          }
        });

      if (!table || !id) {
        this.error = 'Hiányzó paraméter.';
        this.loading = false;
        return;
      }

      this.table = table;
      this.id = id;

      this.loading = true;
      this.error = null;
      this.item = null;
      this.imageUrls = [];

      this.productService.getProductDetails(table, id).subscribe({
        next: res => {
          this.item = this.normalizeItem(res?.item ?? res, table, id);

          this.primary = {
            manufacturer: this.pick(this.item, ['manufacturer', 'Manufacturer', 'brand', 'Brand']),
            model: this.pick(this.item, ['model', 'Model', 'name', 'Name', 'product_name', 'Product Name']),
            category: this.pick(this.item, ['category', 'Category', 'type', 'Type']),
            description: this.pick(this.item, ['description', 'Description', 'notes', 'Notes'])
          };

          this.fields = this.buildFields(this.item);
          this.loadImagesFromMap();

          this.loading = false;
        },
        error: () => {
          this.error = 'Nem sikerült betölteni a terméket.';
          this.loading = false;
        }
      });
    });
  }

  onToggleFavorite() {
    console.log('⭐ később: kedvencbe rakás');
  }

  goBack() {
    if (window.history.length > 1) window.history.back();
    else this.router.navigate(['/home']);
  }

  onPlus() {
    console.log('➕ később: kosárba/setupba adás');
  }

  private loadImagesFromMap() {
    const wantTable = this.normTable(this.table);
    const wantId = String(this.id || '').trim();

    if (!wantTable || !wantId) {
      this.imageUrls = [];
      return;
    }

    if (ProductPageComponent.imageMapCache) {
      this.imageUrls = this.pickImages(ProductPageComponent.imageMapCache, wantTable, wantId);
      console.log('🖼 PAGE imageUrls from cache:', this.imageUrls);
      return;
    }

    this.http.get<ImageMap>('/api/images/map').subscribe({
      next: (mapRes) => {
        ProductPageComponent.imageMapCache = mapRes;
        this.imageUrls = this.pickImages(ProductPageComponent.imageMapCache, wantTable, wantId);

        console.log('🖼 PAGE map loaded:', ProductPageComponent.imageMapCache);
        console.log('🖼 PAGE table:', wantTable, 'id:', wantId);
        console.log('🖼 PAGE imageUrls:', this.imageUrls);
      },
      error: (err) => {
        console.error('❌ image map load error:', err);
        this.imageUrls = [];
      }
    });
  }

  private pickImages(map: ImageMap, tableWanted: string, idWanted: string): string[] {
    if (!map?.[tableWanted]) return [];
    return map[tableWanted][idWanted] || [];
  }

  private normTable(s: string): string {
    return String(s ?? '')
      .trim()
      .toLowerCase()
      .replace('public.', '')
      .replace(/[_\s]+/g, '_');
  }

  private pick(obj: any, keys: string[]): string {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
    return '';
  }

  private parsePrice(raw: any): number | null {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

    const nums = (String(raw).match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(Number.isFinite);

    if (!nums.length) return null;
    if (nums.length === 1) return Math.round(nums[0]);

    return Math.round((Math.min(...nums) + Math.max(...nums)) / 2);
  }

  private normalizeItem(item: any, table: string, id: string): any {
    if (!item || typeof item !== 'object') return item;

    return {
      ...item,
      table_name: item.table_name ?? table,
      id: item.id ?? item.ID ?? id,
      manufacturer: this.pick(item, ['manufacturer', 'Manufacturer', 'brand', 'Brand']),
      model: this.pick(item, ['model', 'Model', 'name', 'Name', 'product_name', 'Product Name']),
      category: this.pick(item, ['category', 'Category', 'type', 'Type']),
      description: this.pick(item, ['description', 'Description', 'notes', 'Notes']),
      price: this.parsePrice(
        item.price ??
        item.Price ??
        item.price_range ??
        item['Price Range (Ft)'] ??
        null
      )
    };
  }

  private buildFields(item: any): Array<{ label: string; value: string }> {
    if (!item) return [];

    const hidden = new Set(['id', 'ID', 'created_at', 'updated_at']);

    const skip = new Set([
      'manufacturer', 'Manufacturer', 'brand', 'Brand',
      'model', 'Model', 'name', 'Name', 'product_name', 'Product Name',
      'category', 'Category', 'type', 'Type',
      'description', 'Description', 'notes', 'Notes',
      'price', 'Price'
    ]);

    return Object.keys(item)
      .filter(k => !hidden.has(k) && !skip.has(k))
      .map(k => ({
        label: this.prettyKey(k),
        value: String(item[k])
      }));
  }

  private prettyKey(k: string): string {
    return k
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }
}
