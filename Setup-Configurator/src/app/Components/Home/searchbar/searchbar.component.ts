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
    // gyártók betöltése
    this.productService.getProducts(2000).subscribe({
      next: (res: any) => {
        const items: any[] = res?.items ?? [];
        const norm = (v: any) => String(v ?? '').trim();

        this.manufacturers = [...new Set<string>(
          items
            .map((p: any) => norm(p.manufacturer) || norm(p.Manufacturer))
            .filter((x: string) => x.length > 0)
        )].sort((a, b) => a.localeCompare(b, 'hu'));
      },
      error: (err) => console.error('Manufacturer load error:', err),
    });


    // aktuális filter visszatöltése
    const cur = this.filtersService.current;      // CombinedFilters
    const s = cur.search;                         // SearchFilters

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

    console.log('SEARCHBAR -> setFilters()', filters);

    this.filtersService.setSearch(filters as SearchFilters);


  }


}
