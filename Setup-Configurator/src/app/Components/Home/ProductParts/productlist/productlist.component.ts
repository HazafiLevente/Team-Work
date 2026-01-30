import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

import { ProductFiltersService } from '../../../Services/Home/Shared/product-filters.service';
import { SearchFilters } from '../../../../Models/Filters/searchfilters.model';

@Component({
  selector: 'app-productlist',
  standalone: true,
  imports: [CommonModule, ProductComponent],
  templateUrl: './productlist.component.html',
  styleUrls: ['./productlist.component.css']
})
export class ProductlistComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];

  loading = true;
  readonly PRODUCT_LIMIT = 20;

  private sub?: Subscription;
  private lastFilters: SearchFilters;

  constructor(
    private productService: ProductService,
    private filtersService: ProductFiltersService
  ) {
    this.lastFilters = this.filtersService.current;
  }

  private getManufacturer(p: any): string {
    const norm = (v: any) => String(v ?? '').trim();

    // ✅ mindent lefedünk: manufacturer / Manufacturer / brands / brand
    return (
      norm(p.manufacturer) ||
      norm(p.Manufacturer) ||
      norm(p.brands) ||
      norm(p.Brands) ||
      norm(p.brand) ||
      norm(p.Brand) ||
      ''
    );
  }


  ngOnInit(): void {
    this.sub = this.filtersService.filters$.subscribe(f => {
      console.log('PRODUCTLIST <- filters$', f);
      this.applyFilters(f);
    });


    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        this.products = res.items || [];
        this.loading = false;

        // induláskor is szűrünk
        this.applyFilters(this.filtersService.current);
      },
      error: err => {
        console.error('API ERROR', err);
        this.loading = false;
      }
    });
  }


  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private norm(v: any): string {
    return String(v ?? '').trim();
  }



  private getPriceNumber(p: any): number | null {
    const n = Number(p?.price);
    return Number.isFinite(n) ? n : null;
  }

  private applyFilters(f: SearchFilters) {
    const term = (f.term || '').toLowerCase().trim();
    const selectedManu = (f.manufacturer || '').toLowerCase().trim();

    let result = this.products.filter((p: any) => {
      const searchable = this.getText(p);
      const manu = this.getManufacturer(p).toLowerCase();

      // ✅ SZAVAS KERESŐ: több mezőben keres
      const matchText = !term || searchable.includes(term);

      // ✅ manufacturer szűrés
      const matchManufacturer = !selectedManu || manu === selectedManu;

      const price = this.getPriceNumber(p);
      const hasPrice = price !== null;

      const matchMin = f.priceMin == null || (hasPrice && price! >= f.priceMin);
      const matchMax = f.priceMax == null || (hasPrice && price! <= f.priceMax);

      return matchText && matchManufacturer && matchMin && matchMax;
    });

    // rendezés: no price mindig a végére
    if (f.sort === 'price_asc') {
      result = [...result].sort((a: any, b: any) => {
        const ap = this.getPriceNumber(a);
        const bp = this.getPriceNumber(b);
        if (ap == null && bp == null) return 0;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return ap - bp;
      });
    } else if (f.sort === 'price_desc') {
      result = [...result].sort((a: any, b: any) => {
        const ap = this.getPriceNumber(a);
        const bp = this.getPriceNumber(b);
        if (ap == null && bp == null) return 0;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return bp - ap;
      });
    } else if (f.sort === 'name_asc') {
      result = [...result].sort((a: any, b: any) =>
        String(a.model ?? a.name ?? '').localeCompare(String(b.model ?? b.name ?? ''), 'hu')
      );
    } else if (f.sort === 'name_desc') {
      result = [...result].sort((a: any, b: any) =>
        String(b.model ?? b.name ?? '').localeCompare(String(a.model ?? a.name ?? ''), 'hu')
      );
    }

    this.filteredProducts = result;
  }

  private getText(p: any): string {
    // amit biztosan szeretnél, hogy a szavas kereső figyeljen
    const model = String(p.model ?? p.Model ?? p.name ?? p.title ?? '').trim();
    const manufacturer = String(p.manufacturer ?? p.Manufacturer ?? '').trim();
    const category = String(p.category ?? p.Category ?? '').trim();
    const desc = String(p.description ?? p.Description ?? '').trim();

    return `${model} ${manufacturer} ${category} ${desc}`.toLowerCase();
  }
}
