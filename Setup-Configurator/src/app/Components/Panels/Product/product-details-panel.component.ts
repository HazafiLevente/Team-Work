import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Product } from '../../../Models/Product/product.model';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-product-details-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details-panel.component.html',
  styleUrls: ['./product-details-panel.component.css']
})
export class ProductDetailsPanelComponent implements OnChanges, OnDestroy {

  @Input({ required: true }) product!: Product;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc() {
    this.close();
  }

  loading = true;
  error: string | null = null;

  details: any = null;

  detailsKeys: string[] = [];
  trackKey = (_: number, k: string) => k;

  private sub?: Subscription;
  private lastKey = '';

  private prevOverflow = '';
  private scrollLocked = false;

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnChanges(): void {
    const table = this.getTable(this.product);
    const id = this.getId(this.product);
    if (!table || id == null) return;

    const key = `${table}::${id}`;
    if (key === this.lastKey) return;

    this.lastKey = key;

    this.lockScroll();
    this.fetchDetails();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.unlockScroll();
  }

  close() {
    this.unlockScroll();
    this.closed.emit();
  }

  onMore() {
    const table = this.getTable(this.product);
    const id = this.getId(this.product);

    if (!table || id == null) {
      console.warn('onMore: missing table/id', { table, id, product: this.product });
      return;
    }

    this.unlockScroll();
    this.closed.emit();
    this.router.navigate(['/product-site', table, id]);
  }

  onPlus() {
    console.log('➕ plus clicked (TODO)');
  }

  private obj(p: any): any {
    return p?.data ?? p ?? {};
  }

  private getTable(p: any): string {
    const o = this.obj(p);
    return String(p?.table_name ?? p?.table ?? o?.table_name ?? o?.table ?? '').trim();
  }

  private getId(p: any): any {
    const o = this.obj(p);
    return p?.id ?? p?.ID ?? o?.id ?? o?.ID;
  }

  get displayModel(): string {
    const o = this.obj(this.product as any);
    return String((this.product as any)?.model ?? o?.model ?? o?.Model ?? '').trim();
  }

  get displayManufacturer(): string {
    const o = this.obj(this.product as any);
    return String((this.product as any)?.manufacturer ?? o?.manufacturer ?? o?.Manufacturer ?? '').trim();
  }

  private fetchDetails() {
    this.loading = true;
    this.error = null;
    this.details = null;
    this.detailsKeys = [];

    this.sub?.unsubscribe();

    const table = this.getTable(this.product);
    const id = this.getId(this.product);

    if (!table || id == null) {
      this.loading = false;
      this.error = 'Hiányzó azonosító (table/id) – nem tölthető be a részlet.';
      console.warn('fetchDetails: missing table/id', { table, id, product: this.product });
      return;
    }

    this.sub = this.productService.getProductDetails(table, id).subscribe({
      next: (res) => {
        const item = res?.item ?? res;

        // ✅ normalize Price -> price
        if (item && (item.price == null || item.price === '') && item.Price != null) {
          const n = Number(item.Price);
          item.price = Number.isFinite(n) ? n : item.Price;
        }

        this.details = item;
        this.detailsKeys = Object.keys(this.details ?? {});
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Nem sikerült betölteni a termék részleteit.';
        this.loading = false;
      }
    });
  }

  keysOf(obj: any): string[] {
    return Array.isArray(this.detailsKeys) && this.detailsKeys.length
      ? this.detailsKeys
      : Object.keys(obj ?? {});
  }

  isHiddenKey(k: string): boolean {
    const x = String(k).toLowerCase();
    return x === 'id' || x === 'created_at' || x === 'updated_at'
      || x === 'price' || x === 'price ' || x === 'Price'.toLowerCase(); // (oké így is)
  }

  private lockScroll() {
    if (this.scrollLocked) return;
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.scrollLocked = true;
  }

  private unlockScroll() {
    if (!this.scrollLocked) return;
    document.body.style.overflow = this.prevOverflow || '';
    this.scrollLocked = false;
  }
}
