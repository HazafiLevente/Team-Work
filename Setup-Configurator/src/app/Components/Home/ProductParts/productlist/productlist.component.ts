import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

import { ProductFiltersService, CombinedFilters } from '../../../Services/Home/Shared/product-filters.service';

type AnyProduct = Product & {
  table_name?: string;
  table?: string;
  data?: any;
  type?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  price?: any;
  id?: any;
  ID?: any;
};

@Component({
  selector: 'app-productlist',
  standalone: true,
  imports: [CommonModule, ProductComponent],
  templateUrl: './productlist.component.html',
  styleUrls: ['./productlist.component.css']
})
export class ProductlistComponent implements OnInit, OnDestroy {

  @Output() openProduct = new EventEmitter<AnyProduct>();
  @Output() productsChanged = new EventEmitter<AnyProduct[]>();
  @Output() statsChanged = new EventEmitter<{ totalAll: number; categoriesAll: string[] }>();

  allProducts: AnyProduct[] = [];
  carProducts: AnyProduct[] = [];
  computerProducts: AnyProduct[] = [];
  htProducts: AnyProduct[] = [];
  allInstruments: AnyProduct[] = [];

  filteredProducts: AnyProduct[] = [];

  // ✅ PAGINATION
  readonly PAGE_SIZE = 50;
  page = 1;
  totalPages = 1;
  pagedProducts: AnyProduct[] = [];

  loading = true;
  readonly PRODUCT_LIMIT = 2000;

  private sub?: Subscription;

  constructor(
    private productService: ProductService,
    private filtersService: ProductFiltersService
  ) {}

  ngOnInit(): void {
    this.sub = this.filtersService.filters$.subscribe(f => this.applyFilters(f));

    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe(res => {
      this.allProducts = (res.items || []) as AnyProduct[];
      this.loading = false;
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getCars(this.PRODUCT_LIMIT).subscribe(res => {
      this.carProducts = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getComputers(this.PRODUCT_LIMIT).subscribe(res => {
      this.computerProducts = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getHomeTheaters(this.PRODUCT_LIMIT).subscribe(res => {
      this.htProducts = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getInstruments(this.PRODUCT_LIMIT).subscribe(res => {
      this.allInstruments = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onOpenProduct(p: AnyProduct) {
    this.openProduct.emit(p);
  }

  private emitStats() {
    const merged = [
      ...this.allProducts,
      ...this.carProducts,
      ...this.computerProducts,
      ...this.htProducts,
      ...this.allInstruments
    ];

    const map = new Map<string, AnyProduct>();
    for (const p of merged) {
      const table = p.table_name ?? p.table;
      const id = p.id ?? p.ID;
      if (!table || !id) continue;
      map.set(`${table}:${id}`, p);
    }

    const cats = new Set<string>();
    map.forEach(p => cats.add(p.table_name ?? p.table ?? ''));

    this.statsChanged.emit({
      totalAll: map.size,
      categoriesAll: Array.from(cats).sort()
    });
  }

  private applyFilters(state: CombinedFilters) {
    const source =
      state.activeCategory === 'car' ? this.carProducts :
        state.activeCategory === 'computer' ? this.computerProducts :
          state.activeCategory === 'ht' ? this.htProducts :
            state.activeCategory === 'instrument' ? this.allInstruments :
              this.allProducts;

    this.filteredProducts = source.filter(Boolean);

    // ✅ reset page filter váltásnál
    this.page = 1;
    this.updatePaged();

    this.productsChanged.emit(this.filteredProducts);
  }

  private updatePaged() {
    const total = this.filteredProducts.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));

    const start = (this.page - 1) * this.PAGE_SIZE;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.PAGE_SIZE);
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.updatePaged();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePaged();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
