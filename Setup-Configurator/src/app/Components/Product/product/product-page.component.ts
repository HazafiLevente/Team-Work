import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';
import { ProductGalleryComponent } from '../productgallery/product-gallery.component';
import { HttpClient } from '@angular/common/http';

type ImageMap = Record<string, Record<string, Record<string, string[]>>>;

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, ProductGalleryComponent],
  templateUrl: `product-page.component.html`,
  styleUrls: ['product-page.component.css']
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

  // egyszer töltsük le a map-et (memóriában cache)
  private static imageMapCache: ImageMap | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private http: HttpClient
  ) {}

  get displayTitle(): string {
    return this.primary.model || 'Ismeretlen termék';
  }

  get displaySubtitle(): string {
    return this.primary.manufacturer || '';
  }

  get displayPrice(): string | null {
    const p = this.item?.price;
    const n = Number(p);
    if (!Number.isFinite(n)) return null;
    return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const table = params.get('table');
      const id = params.get('id');

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
          this.item = res?.item ?? res;

          this.primary = {
            manufacturer: this.pick(this.item, ['manufacturer', 'Manufacturer', 'brand', 'Brand']),
            model: this.pick(this.item, ['model', 'Model', 'name', 'Name', 'product_name', 'Product Name']),
            category: this.pick(this.item, ['category', 'Category', 'type', 'Type']),
            description: this.pick(this.item, ['description', 'Description', 'notes', 'Notes'])
          };

          this.fields = this.buildFields(this.item);

          // képek: images.runtime.json map alapján
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

  // ✅ később: kedvenc
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
    const manu = this.primary.manufacturer;
    const model = this.primary.model;

    if (!manu || !model) {
      this.imageUrls = [];
      return;
    }

    const wantTop = this.table;

    // ha már van cache, abból dolgozunk
    if (ProductPageComponent.imageMapCache) {
      this.imageUrls = this.pickImages(ProductPageComponent.imageMapCache, wantTop, manu, model);
      return;
    }

    // különben letöltjük egyszer
    this.http.get<any>('/api/images/map').subscribe({
      next: (mapRes) => {
        ProductPageComponent.imageMapCache = (mapRes?.images ?? {}) as ImageMap;
        this.imageUrls = this.pickImages(ProductPageComponent.imageMapCache!, wantTop, manu, model);
      },
      error: () => {
        this.imageUrls = [];
      }
    });
  }

  private pickImages(map: ImageMap, topFolderWanted: string, manuWanted: string, modelWanted: string): string[] {
    const topKey = this.findKey(map, topFolderWanted);
    if (!topKey) return [];

    const manuMap = map[topKey] || {};
    const manuKey = this.findKey(manuMap, manuWanted);
    if (!manuKey) return [];

    const modelMap = manuMap[manuKey] || {};
    const modelKey = this.findKey(modelMap, modelWanted);
    if (!modelKey) return [];

    return modelMap[modelKey] || [];
  }

  private findKey(obj: Record<string, any>, wanted: string): string | null {
    const want = this.normKey(wanted);

    // exact normalized match
    for (const k of Object.keys(obj)) {
      if (this.normKey(k) === want) return k;
    }

    // contains match
    for (const k of Object.keys(obj)) {
      const nk = this.normKey(k);
      if (nk.includes(want) || want.includes(nk)) return k;
    }

    return null;
  }

  private normKey(s: string): string {
    return String(s ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\s-]+/g, '');
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

  private buildFields(item: any): Array<{ label: string; value: string }> {
    if (!item) return [];

    const hidden = new Set(['id', 'ID', 'created_at', 'updated_at']);

    const skip = new Set([
      'manufacturer','Manufacturer','brand','Brand',
      'model','Model','name','Name','product_name','Product Name',
      'category','Category','type','Type',
      'description','Description','notes','Notes',
      'price','Price'
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
