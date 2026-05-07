import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductFiltersService } from '../../Services/Home/Shared/product-filters.service';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';
import { SearchFilters } from '../../../Models/Filters/searchfilters.model';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.css'],
})
export class SearchbarComponent implements OnInit {
  manufacturers: string[] = [];

  term = '';
  manufacturer = '';
  priceMin: number | null = null;
  priceMax: number | null = null;
  sort = '';

  constructor(
    private filtersService: ProductFiltersService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.productService.getBrands().subscribe({
      next: (res: any) => {
        this.manufacturers = [...new Set<string>(
          (res?.brands ?? [])
            .map((brand: any) => String(brand ?? '').trim())
            .filter((x: string) => x.length > 0)
        )].sort((a, b) => a.localeCompare(b, 'hu'));
      },
      error: (err) => console.error('Manufacturer load error:', err),
    });

    const cur = this.filtersService.current;
    const s = cur.search;

    this.term = s.term ?? '';
    this.manufacturer = s.manufacturer ?? '';
    this.priceMin = s.priceMin ?? null;
    this.priceMax = s.priceMax ?? null;
    this.sort = s.sort ?? '';
  }

  sanitizePrice(which: 'min' | 'max'): void {
    if (which === 'min') {
      if (this.priceMin == null) return;
      const v = Math.max(0, Math.floor(Number(this.priceMin)));
      this.priceMin = Number.isFinite(v) ? v : null;
    } else {
      if (this.priceMax == null) return;
      const v = Math.max(0, Math.floor(Number(this.priceMax)));
      this.priceMax = Number.isFinite(v) ? v : null;
    }
  }

  searchButton(): void {
    const filters = {
      term: (this.term || '').trim(),
      manufacturer: (this.manufacturer || '').trim(),
      priceMin: this.priceMin,
      priceMax: this.priceMax,
      sort: (this.sort || '').trim()
    };


    this.filtersService.setSearch(filters as SearchFilters);
  }
}
