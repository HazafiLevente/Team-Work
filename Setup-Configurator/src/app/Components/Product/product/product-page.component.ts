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
  template: `
    <div class="wrap">
      <div class="topbar">
        <button class="btn ghost" (click)="goBack()">← Vissza</button>

        <div class="top-actions">
          <button class="btn" (click)="onPlus()">+ (később)</button>
        </div>
      </div>

      <div class="header" *ngIf="!loading && item">
        <div class="title-area">
          <div class="kicker">Termék részletek</div>
          <h1 class="title">{{ displayTitle }}</h1>
          <div class="subtitle">{{ displaySubtitle }}</div>
        </div>

        <div class="badges">
          <div class="badge" *ngIf="displayPrice">
            {{ displayPrice }}
          </div>
          <div class="badge subtle">
            {{ table }} / #{{ id }}
          </div>
        </div>
      </div>

      <div class="card" *ngIf="loading">
        Betöltés...
      </div>

      <div class="card error" *ngIf="!loading && error">
        {{ error }}
      </div>

      <app-product-gallery
        *ngIf="!loading && item"
        [images]="imageUrls"
        [title]="displayTitle">
      </app-product-gallery>

      <div class="grid" *ngIf="!loading && item">
        <div class="card">
          <div class="card-title">Áttekintés</div>

          <div class="kv">
            <div class="row" *ngIf="primary.manufacturer">
              <div class="k">Gyártó</div>
              <div class="v">{{ primary.manufacturer }}</div>
            </div>

            <div class="row" *ngIf="primary.model">
              <div class="k">Modell</div>
              <div class="v">{{ primary.model }}</div>
            </div>

            <div class="row" *ngIf="primary.category">
              <div class="k">Kategória</div>
              <div class="v">{{ primary.category }}</div>
            </div>

            <div class="row" *ngIf="primary.description">
              <div class="k">Leírás</div>
              <div class="v">{{ primary.description }}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Tulajdonságok</div>

          <div class="kv">
            <ng-container *ngFor="let f of fields">
              <div class="row">
                <div class="k">{{ f.label }}</div>
                <div class="v">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <div class="card subtle-card" *ngIf="!loading && item">
        <details>
          <summary>Debug / nyers adat</summary>
          <pre class="raw">{{ item | json }}</pre>
        </details>
      </div>
    </div>
  `,
  styles: [`
    .wrap{
      padding: 22px;
      max-width: 1100px;
    }

    .topbar{
      display:flex;
      align-items:center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .top-actions{ display:flex; gap:10px; }

    .btn{
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
      color: #fff;
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: transform .06s ease, background .15s ease;
    }
    .btn:hover{ background: rgba(255,255,255,.10); }
    .btn:active{ transform: translateY(1px); }

    .btn.ghost{
      background: transparent;
      border-color: rgba(255,255,255,.12);
    }

    .header{
      display:flex;
      align-items:flex-start;
      justify-content: space-between;
      gap: 18px;
      margin: 10px 0 18px 0;
    }

    .kicker{
      opacity:.7;
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .title{
      font-size: 28px;
      margin: 0;
      line-height: 1.15;
    }

    .subtitle{
      opacity: .8;
      margin-top: 6px;
      font-size: 14px;
    }

    .badges{
      display:flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
      min-width: 200px;
    }

    .badge{
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
      font-weight: 700;
      white-space: nowrap;
    }

    .badge.subtle{
      font-weight: 600;
      opacity: .85;
    }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 900px){
      .header{ flex-direction: column; }
      .badges{ align-items: flex-start; }
      .grid{ grid-template-columns: 1fr; }
    }

    .card{
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      border-radius: 16px;
      padding: 14px 14px;
      box-shadow: 0 10px 35px rgba(0,0,0,.25);
    }

    .card-title{
      font-weight: 800;
      margin-bottom: 12px;
      opacity: .95;
    }

    .kv .row{
      display:grid;
      grid-template-columns: 180px 1fr;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }

    .kv .row:last-child{
      border-bottom: none;
    }

    .k{
      opacity: .75;
      font-size: 13px;
    }

    .v{
      font-size: 14px;
      word-break: break-word;
    }

    .error{
      border-color: rgba(255, 120, 120, .35);
      background: rgba(255, 120, 120, .08);
      color: #ffb3b3;
      font-weight: 600;
    }

    .subtle-card{
      margin-top: 14px;
      opacity: .9;
    }

    .raw{
      margin: 10px 0 0 0;
      font-size: 12px;
      opacity: .9;
      overflow:auto;
    }

    details summary{
      cursor: pointer;
      opacity: .8;
      font-weight: 700;
    }
  `]
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

  private loadImagesFromMap() {
    const manu = this.primary.manufacturer;
    const model = this.primary.model;

    if (!this.table || !manu || !model) {
      this.imageUrls = [];
      return;
    }

    // ha már van cache, abból dolgozunk
    if (ProductPageComponent.imageMapCache) {
      this.imageUrls =
        ProductPageComponent.imageMapCache?.[this.table]?.[manu]?.[model] ?? [];
      return;
    }

    // különben letöltjük egyszer
    this.http.get<any>('/api/images/map').subscribe({
      next: (mapRes) => {
        ProductPageComponent.imageMapCache = (mapRes?.images ?? {}) as ImageMap;
        this.imageUrls =
          ProductPageComponent.imageMapCache?.[this.table]?.[manu]?.[model] ?? [];
      },
      error: () => {
        // ha nincs map, csak ne legyen kép
        this.imageUrls = [];
      }
    });
  }

  goBack() {
    if (window.history.length > 1) window.history.back();
    else this.router.navigate(['/home']);
  }

  onPlus() {
    console.log('➕ később: kosárba/setupba adás');
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
