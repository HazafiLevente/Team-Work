import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Router } from '@angular/router';

import { Product } from '../../../Models/Product/product.model';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';

@Component({
  selector: 'app-product-details-panel',

  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details-panel.component.html',
  styleUrls: ['./product-details-panel.component.css']
})
export class ProductDetailsPanelComponent implements OnChanges {

  @Input({ required: true }) product!: Product;
  @Output() closed = new EventEmitter<void>();

  loading = true;
  error: string | null = null;

  details: any = null;

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnChanges(): void {
    this.fetchDetails();
  }

  close() {
    this.closed.emit();
  }

  // ✅ "Több" gomb: átvisz a részletes product-site oldalra
  onMore() {
    const table = this.getTable(this.product);
    const id = this.getId(this.product);

    if (!table || id == null) {
      console.warn('onMore: missing table/id', { table, id, product: this.product });
      return;
    }

    this.closed.emit();
    this.router.navigate(['/product', table, id]);
  }

  onPlus() {
    console.log('➕ plus clicked (TODO)');
  }

  // -------------------------
  // SAFE GETTERS (ez a lényeg)
  // -------------------------

  private obj(p: any): any {
    return p?.data ?? p ?? {};
  }

  private getTable(p: any): string {
    const o = this.obj(p);
    return String(p?.table_name ?? p?.table ?? o?.table_name ?? o?.table ?? '').trim();
  }

  private getId(p: any): any {
    const o = this.obj(p);
    // autóknál sokszor ID
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

    const table = this.getTable(this.product);
    const id = this.getId(this.product);

    if (!table || id == null) {
      this.loading = false;
      this.error = 'Hiányzó azonosító (table/id) – nem tölthető be a részlet.';
      console.warn('fetchDetails: missing table/id', { table, id, product: this.product });
      return;
    }

    this.productService.getProductDetails(table, id).subscribe({
      next: (res) => {
        this.details = res?.item ?? res;
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
    if (!obj) return [];
    return Object.keys(obj);
  }

  isHiddenKey(k: string): boolean {
    const x = k.toLowerCase();
    return x === 'id' || x === 'created_at' || x === 'updated_at';
  }
}
