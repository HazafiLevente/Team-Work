import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

import { ProductFiltersService, CombinedFilters } from '../../../Services/Home/Shared/product-filters.service';
import { normalizeList } from '../../../Services/Home/Shared/product-normalizer';
import {
  passesCarFilters,
  passesComputerFilters,
  passesHtFilters,
  passesInstrumentFilters
} from '../../../Services/Home/Shared/product-advanced-filter.util';

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

  price_range?: any;
  body_type?: any;
  horsepower?: any;
  acceleration?: any;
  seats?: any;
  fuel_type?: any;
  year?: any;
  transmission?: any;
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

  readonly PAGE_SIZE = 24;
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

    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe({
      next: (res) => {
        this.allProducts = normalizeList(res.items || []);
        this.rebuildCategoryBuckets();
        this.loading = false;
        this.emitStats();
        this.applyFilters(this.filtersService.current);
      },
      error: (err) => {
        console.error('Product load error:', err);
        this.allProducts = [];
        this.rebuildCategoryBuckets();
        this.loading = false;
        this.emitStats();
        this.applyFilters(this.filtersService.current);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onOpenProduct(p: AnyProduct) {
    this.openProduct.emit(p);
  }




  private norm(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private getTable(p: AnyProduct): string {
    return String(p.table_name ?? p.table ?? '').trim();
  }

  private getId(p: AnyProduct): any {
    return p.id ?? p.ID ?? p.data?.id ?? p.data?.ID;
  }

  private getManufacturer(p: AnyProduct): string {
    return String(
      p.manufacturer ??
      p.data?.manufacturer ??
      p.data?.Manufacturer ??
      p.data?.brand ??
      p.data?.Brand ??
      ''
    ).trim();
  }

  private getModel(p: AnyProduct): string {
    return String(
      p.model ??
      p.data?.model ??
      p.data?.Model ??
      p.data?.name ??
      p.data?.Name ??
      ''
    ).trim();
  }

  private getPrice(p: AnyProduct): number | null {
    const raw =
      p.price ??
      p.price_range ??
      p.data?.price ??
      p.data?.Price ??
      p.data?.price_range ??
      p.data?.['Price Range (Ft)'];

    if (raw == null || raw === '') return null;

    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? raw : null;
    }

    const s = String(raw)
      .trim()
      .replace(/\s/g, '')
      .replace(/,/g, '.');

    const nums = (s.match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(Number.isFinite);

    if (!nums.length) return null;
    if (nums.length === 1) return Math.round(nums[0]);

    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return Math.round((min + max) / 2);
  }

  private containsAny(value: any, needles: string[]): boolean {
    const hay = this.norm(value);
    if (!hay) return false;
    return needles.some(needle => hay.includes(this.norm(needle)));
  }

  private isCarProduct(p: AnyProduct): boolean {
    return (
      this.containsAny(p.category, ['car']) ||
      this.containsAny(p.type, ['car']) ||
      this.containsAny(this.getTable(p), [
        'car',
        'cabrio_cars',
        'coupe_cars',
        'crossover_cars',
        'hatchback_cars',
        'mpv_cars',
        'pickup_cars',
        'wagon_cars'
      ])
    );
  }

  private isComputerProduct(p: AnyProduct): boolean {
    return (
      this.containsAny(p.category, [
        'computer',
        'pc',
        'cpu_desktop',
        'gpu',
        'motherboard',
        'ram',
        'psu',
        'cpu_cooler',
        'soundcard',
        'server_desktop'
      ]) ||
      this.containsAny(p.type, [
        'computer',
        'pc',
        'cpu_desktop',
        'gpu',
        'motherboard',
        'ram',
        'psu',
        'cpu_cooler',
        'soundcard',
        'server_desktop'
      ]) ||
      this.containsAny(this.getTable(p), [
        'computer',
        'pc',
        'processors',
        'video_cards',
        'motherboard',
        'ram',
        'psu',
        'cpu_coolers',
        'soundcards',
        'storages'
      ])
    );
  }

  private isHtProduct(p: AnyProduct): boolean {
    return (
      this.containsAny(p.category, [
        'ht',
        'home theater',
        'home_theater',
        'receiver',
        'audio_processor',
        'portable_speaker',
        'front_speaker',
        'back_speaker',
        'side_speaker',
        'center_speaker',
        'floor_speaker',
        'ceiling_speaker',
        'subwoofer',
        'bass_amplifier',
        'bass_shaker',
        'studio_monitor',
        'soundbar'
      ]) ||
      this.containsAny(p.type, [
        'ht',
        'home theater',
        'home_theater',
        'receiver',
        'audio_processor',
        'portable_speaker',
        'front_speaker',
        'back_speaker',
        'side_speaker',
        'center_speaker',
        'floor_speaker',
        'ceiling_speaker',
        'subwoofer',
        'bass_amplifier',
        'bass_shaker',
        'studio_monitor',
        'soundbar'
      ]) ||
      this.containsAny(this.getTable(p), [
        'home_theater',
        'audio_processors',
        'portable_speakers',
        'front_speaker',
        'back_speaker',
        'side_speaker',
        'center_speakers',
        'floor_speakers',
        'ceiling_speakers',
        'subwoofer',
        'bass_amplifier',
        'bass_shaker',
        'studio_monitor_speakers'
      ])
    );
  }

  private isInstrumentProduct(p: AnyProduct): boolean {
    return (
      this.containsAny(p.category, [
        'inst',
        'instrument',
        'instruments',
        'accessory',
        'accessories',
        'acoustic_drums',
        'acoustic_guitar',
        'trumpet',
        'saxophone',
        'guitar',
        'drum'
      ]) ||
      this.containsAny(p.type, [
        'inst',
        'instrument',
        'instruments',
        'accessory',
        'accessories',
        'acoustic_drums',
        'acoustic_guitar',
        'trumpet',
        'saxophone',
        'guitar',
        'drum'
      ]) ||
      this.containsAny(this.getTable(p), [
        'inst',
        'instrument',
        'instruments',
        'accessory',
        'accessories',
        'acoustic_drums',
        'acoustic_guitars',
        'c_trumpets',
        'alt_saxophone'
      ])
    );
  }

  private rebuildCategoryBuckets(): void {
    const merged = this.getAllMergedBase();

    this.carProducts = merged.filter(p => this.isCarProduct(p));
    this.computerProducts = merged.filter(p => this.isComputerProduct(p));
    this.htProducts = merged.filter(p => this.isHtProduct(p));
    this.allInstruments = merged.filter(p => this.isInstrumentProduct(p));
  }




  private getAllMergedBase(): AnyProduct[] {
    const map = new Map<string, AnyProduct>();

    for (const p of this.allProducts) {
      const table = this.getTable(p);
      const id = this.getId(p);

      if (table && id != null) {
        map.set(`${table}:${id}`, p);
      } else {
        map.set(`fallback:${Math.random()}`, p);
      }
    }

    return Array.from(map.values());
  }

  private getAllMerged(): AnyProduct[] {
    const merged = [
      ...this.allProducts,
      ...this.carProducts,
      ...this.computerProducts,
      ...this.htProducts,
      ...this.allInstruments
    ];

    const map = new Map<string, AnyProduct>();
    for (const p of merged) {
      const table = this.getTable(p);
      const id = this.getId(p);
      if (!table || id == null) continue;
      map.set(`${table}:${id}`, p);
    }

    return Array.from(map.values());
  }

  private getSourceByCategory(state: CombinedFilters): AnyProduct[] {
    switch (state.activeCategory) {
      case 'car':
        return this.carProducts;
      case 'computer':
        return this.computerProducts;
      case 'ht':
        return this.htProducts;
      case 'instrument':
        return this.allInstruments;
      default:
        return this.getAllMergedBase();
    }
  }




  private applySearch(list: AnyProduct[], state: CombinedFilters): AnyProduct[] {
    const s: any = (state as any).search ?? {};

    const term = this.norm(s.term);
    const man = this.norm(s.manufacturer);

    const pMin = toNum(s.priceMin);
    const pMax = toNum(s.priceMax);

    return list.filter(p => {
      const manufacturer = this.norm(this.getManufacturer(p));
      const model = this.norm(this.getModel(p));
      const price = this.getPrice(p);

      if (term) {
        const hay = `${manufacturer} ${model}`;
        if (!hay.includes(term)) return false;
      }

      if (man) {
        if (!manufacturer.includes(man)) return false;
      }

      if (pMin != null) {
        if (price == null || price < pMin) return false;
      }

      if (pMax != null) {
        if (price == null || price > pMax) return false;
      }

      return true;
    });

    function toNum(v: any): number | null {
      if (v == null || v === '') return null;
      const n = Number(String(v).trim());
      return Number.isFinite(n) ? n : null;
    }
  }




  private applyDetailed(list: AnyProduct[], state: CombinedFilters): AnyProduct[] {
    switch (state.activeCategory) {
      case 'car':
        return list.filter(p => passesCarFilters(p, state.car));

      case 'computer':
        return list.filter(p => passesComputerFilters(p, state.computer));

      case 'ht':
        return list.filter(p => passesHtFilters(p, state.ht));

      case 'instrument':
        return list.filter(p => passesInstrumentFilters(p, state.instrument));

      default:
        return list;
    }
  }




  private applySort(list: AnyProduct[], state: CombinedFilters): AnyProduct[] {
    const s: any = (state as any).search ?? {};
    const sort = String(s.sort ?? '').trim();

    const getPrice = (p: AnyProduct) => this.getPrice(p) ?? -1;
    const getName = (p: AnyProduct) =>
      `${this.getManufacturer(p)} ${this.getModel(p)}`.trim().toLowerCase();

    const out = [...list];

    if (sort === 'price_asc') out.sort((a, b) => getPrice(a) - getPrice(b));
    else if (sort === 'price_desc') out.sort((a, b) => getPrice(b) - getPrice(a));
    else if (sort === 'name_asc') out.sort((a, b) => getName(a).localeCompare(getName(b), 'hu'));
    else if (sort === 'name_desc') out.sort((a, b) => getName(b).localeCompare(getName(a), 'hu'));

    return out;
  }




  private applyFilters(state: CombinedFilters) {
    const source = this.getSourceByCategory(state);

    let list = this.applySearch(source.filter(Boolean), state);
    list = this.applyDetailed(list, state);
    list = this.applySort(list, state);

    this.filteredProducts = list;

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




  private emitStats() {
    const merged = this.getAllMerged();

    const map = new Map<string, AnyProduct>();
    for (const p of merged) {
      const table = this.getTable(p);
      const id = this.getId(p);
      if (!table || id == null) continue;
      map.set(`${table}:${id}`, p);
    }

    const cats = new Set<string>();
    map.forEach(p => cats.add(this.getTable(p) || ''));

    this.statsChanged.emit({
      totalAll: map.size,
      categoriesAll: Array.from(cats).filter(Boolean).sort()
    });
  }
}
