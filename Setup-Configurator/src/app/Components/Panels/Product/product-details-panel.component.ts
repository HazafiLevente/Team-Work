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
  ) {
    console.log('🔥 ProductDetailsPanelComponent CREATED');
  }

  ngOnChanges(): void {
    console.log('🟦 ProductDetailsPanelComponent ngOnChanges, product =', this.product);
    this.fetchDetails();
  }

  close() {
    this.closed.emit();
  }

  // ✅ "Több" gomb: átvisz a részletes product oldalra
  onMore() {
    const table = (this.product as any).table_name ?? (this.product as any).table;
    const id = (this.product as any).id;

    // ha nincs routingotok még, ez a rész nem fog működni
    // (de a kód jó – csak kell route)
    this.closed.emit();
    this.router.navigate(['/product', table, id]);
  }

  // ✅ "+" gomb: egyelőre semmi
  onPlus() {
    console.log('➕ plus clicked (TODO)');
  }

  private fetchDetails() {


    this.loading = true;
    this.error = null;
    this.details = null;

    const table = (this.product as any).table_name ?? (this.product as any).table;
    const id = (this.product as any).id;
    console.log('DETAILS request table/id:', table, id);

    this.productService.getProductDetails(table, id).subscribe({
      next: (res) => {
        console.log('DETAILS response:', res);

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
  displayPrice(details: any): string {
    if (!details) return 'N/A';

    const p = details.price ?? details.Price;
    if (p != null && String(p).trim() !== '') {
      const num = Number(p);
      return Number.isFinite(num) ? `${num.toLocaleString('hu-HU')} Ft` : String(p);
    }

    const avg = details.Avgprice ?? details.avgprice;
    if (avg != null && String(avg).trim() !== '') {
      const num = Number(String(avg).replace(/[^0-9]/g, ''));
      return Number.isFinite(num) ? `${num.toLocaleString('hu-HU')} Ft (átlag)` : `${avg} (átlag)`;
    }

    const pr = details['Price Range (Ft)'] ?? details.price_range;
    if (pr != null && String(pr).trim() !== '') return String(pr);

    return 'N/A';
  }

}
