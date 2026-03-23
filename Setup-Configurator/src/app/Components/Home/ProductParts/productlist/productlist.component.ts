import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

import { ProductFiltersService, CombinedFilters } from '../../../Services/Home/Shared/product-filters.service';
import { normalizeList } from '../../../Services/Home/Shared/product-normalizer';

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

  // car top-level fallbackok
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

  /* -----------------------------
     UTILS
  ----------------------------- */

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
      p.data?.["Price Range (Ft)"];

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

  private field(p: AnyProduct, ...keys: string[]): any {
    for (const key of keys) {
      const top = (p as any)?.[key];
      if (top !== undefined && top !== null && String(top) !== '') return top;

      const nested = (p as any)?.data?.[key];
      if (nested !== undefined && nested !== null && String(nested) !== '') return nested;
    }
    return null;
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
      this.containsAny(p.category, ['computer', 'pc']) ||
      this.containsAny(p.type, ['computer', 'pc']) ||
      this.containsAny(this.getTable(p), [
        'computer',
        'pc',
        'processors',
        'video_cards',
        'gpus',
        'graphics_cards',
        'ram',
        'memory',
        'storage',
        'ssd',
        'hdd',
        'nvme',
        'storage_devices',
        'psu',
        'power_supply',
        'power_supplies'
      ])
    );
  }

  private isHtProduct(p: AnyProduct): boolean {
    return (
      this.containsAny(p.category, ['home theater', 'home_theater', 'ht']) ||
      this.containsAny(p.type, ['home theater', 'home_theater', 'ht']) ||
      this.containsAny(this.getTable(p), [
        'home_theater',
        'home-theater',
        'ht',
        'receiver',
        'receivers',
        'speaker',
        'speakers',
        'subwoofer',
        'audio_processor'
      ])
    );
  }

  private isInstrumentProduct(p: AnyProduct): boolean {
    return (
      this.containsAny(p.category, ['instrument']) ||
      this.containsAny(p.type, ['instrument']) ||
      this.containsAny(this.getTable(p), ['instrument'])
    );
  }

  private rebuildCategoryBuckets(): void {
    const merged = this.getAllMerged();

    this.carProducts = merged.filter(p => this.isCarProduct(p));
    this.computerProducts = merged.filter(p => this.isComputerProduct(p));
    this.htProducts = merged.filter(p => this.isHtProduct(p));
    this.allInstruments = merged.filter(p => this.isInstrumentProduct(p));
  }

  /* -----------------------------
     ALL MERGED (dedup)
  ----------------------------- */

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
      case 'car': return this.carProducts;
      case 'computer': return this.computerProducts;
      case 'ht': return this.htProducts;
      case 'instrument': return this.allInstruments;
      default: return this.getAllMerged();
    }
  }

  /* -----------------------------
     SEARCHBAR FILTER
  ----------------------------- */

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

  /* -----------------------------
     DETAILED FILTERS
  ----------------------------- */

  private applyDetailed(list: AnyProduct[], state: CombinedFilters): AnyProduct[] {
    const norm = (v: any) => String(v ?? '').trim().toLowerCase();

    const toNum = (v: any): number | null => {
      if (v == null || v === '') return null;
      const s = String(v).trim().replace(',', '.');
      const m = s.match(/-?\d+(\.\d+)?/);
      if (!m) return null;
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : null;
    };

    const matchText = (value: any, needle: string) => {
      if (!needle) return true;
      return norm(value).includes(norm(needle));
    };

    const matchExact = (value: any, expected: string) => {
      if (!expected) return true;
      return norm(value) === norm(expected);
    };

    const matchRange = (value: any, minV: any, maxV: any) => {
      const min = toNum(minV);
      const max = toNum(maxV);
      if (min == null && max == null) return true;

      const v = toNum(value);
      if (v == null) return false;

      if (min != null && v < min) return false;
      if (max != null && v > max) return false;
      return true;
    };

    const matchBool = (value: any, wantTrue: boolean) => {
      if (!wantTrue) return true;
      if (typeof value === 'boolean') return value === true;
      const s = norm(value);
      return s === 'true' || s === '1' || s === 'yes' || s === 'igen';
    };

    // ---------------- CAR ----------------
    // ---------------- CAR ----------------
    if (state.activeCategory === 'car') {
      const f: any = (state as any).car ?? {};

      const manF = norm(f.manufacturer);
      const modelF = norm(f.model);

      const parseLooseRange = (value: any): { min: number; max: number } | null => {
        const s = String(value ?? '').trim().replace(',', '.');
        if (!s) return null;

        const nums = (s.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
        if (!nums.length) return null;

        if (nums.length === 1) return { min: nums[0], max: nums[0] };

        return {
          min: Math.min(...nums),
          max: Math.max(...nums)
        };
      };

      const overlapsFilterRange = (value: any, minWanted: any, maxWanted: any) => {
        const wantMin = toNum(minWanted);
        const wantMax = toNum(maxWanted);

        if (wantMin == null && wantMax == null) return true;

        const r = parseLooseRange(value);
        if (!r) return false;

        if (wantMin != null && r.max < wantMin) return false;
        if (wantMax != null && r.min > wantMax) return false;

        return true;
      };

      return list.filter(p => {
        const manu = norm(this.getManufacturer(p));
        const model = norm(this.getModel(p));

        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        // ha az autóknál nincs rendes numeric price, ezt hagyhatod így vagy kikapcsolhatod
        if (!matchRange(this.getPrice(p), f.priceMin, f.priceMax)) return false;

        const year = this.field(p, 'year', 'Year');
        if (!overlapsFilterRange(year, f.yearMin, f.yearMax)) return false;

        const seats = this.field(p, 'seats', 'Seats');
        if (!overlapsFilterRange(seats, f.seatsMin, f.seatsMax)) return false;

        const hp = this.field(p, 'horsepower', 'Horsepower');
        if (!overlapsFilterRange(hp, f.hpMin, f.hpMax)) return false;

        const acc = this.field(p, 'acceleration', 'Acceleration', 'Acceleration (s)');
        if (!overlapsFilterRange(acc, f.accelMin, f.accelMax)) return false;

        const fuelVal = norm(this.field(p, 'fuel_type', 'FuelType', 'fuel', 'Fuel Type'));
        if (f.fuel) {
          if (!fuelVal) return false;
          if (!fuelVal.includes(norm(f.fuel))) return false;
        }

        const transVal = norm(this.field(p, 'transmission', 'Transmission'));
        if (f.transmission && !transVal.includes(norm(f.transmission))) return false;

        const bodyVal = norm(this.field(p, 'body_type', 'BodyType', 'body', 'Body Type'));
        if (f.bodyType && !bodyVal.includes(norm(f.bodyType))) return false;

        return true;
      });
    }

    // ---------------- HT ----------------
    if (state.activeCategory === 'ht') {
      const f: any = (state as any).ht ?? {};

      const manF = norm(f.manufacturer);
      const modelF = norm(f.model);

      const hasV2 = ('dynamic' in f) || ('tableName' in f) || ('priceMin' in f);

      return list.filter(p => {
        const manu = norm(this.getManufacturer(p));
        const model = norm(this.getModel(p));

        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        if (hasV2) {
          const tableName = norm(f.tableName);
          if (tableName) {
            const t = norm(p.table_name ?? p.table);
            if (t !== tableName) return false;
          }

          if (!matchRange(this.getPrice(p), f.priceMin, f.priceMax)) return false;

          const dyn = f.dynamic ?? {};
          for (const key of Object.keys(dyn)) {
            const v = dyn[key];
            const field = this.field(p, key);

            if (typeof v === 'boolean') {
              if (!matchBool(field, v)) return false;
            } else if (typeof v === 'string') {
              if (v && !matchExact(field, v)) return false;
            } else if (v && typeof v === 'object') {
              if (!matchRange(field, v.min, v.max)) return false;
            }
          }

          return true;
        }

        return true;
      });
    }

    // ---------------- COMPUTER ----------------
    // ---------------- COMPUTER ----------------
    if (state.activeCategory === 'computer') {
      const f: any = (state as any).computer ?? {};

      const hasCpu = !!(f.cpuBrand || f.cpuModel);
      const hasGpu = !!(f.gpuBrand || f.gpuModel);
      const hasRam = !!(f.ramMin || f.ramMax || f.storageType); // memória típus a RAM-hoz is tartozzon
      const hasStorage = !!(f.storageMin || f.storageMax);
      const hasPsu = !!(f.psuMin || f.psuMax);

      const hasAnyComputerFilter = hasCpu || hasGpu || hasRam || hasStorage || hasPsu;

      return list.filter(p => {
        const table = norm(p.table_name ?? p.table);
        const manufacturer = norm(this.getManufacturer(p));
        const model = norm(this.getModel(p));

        if (!hasAnyComputerFilter) return this.isComputerProduct(p);

        let matchedAny = false;

        // CPU
        if (hasCpu && (table === 'processors' || this.containsAny(this.field(p, 'type', 'category', 'component_type'), ['cpu', 'processor']))) {
          let ok = true;

          if (f.cpuBrand && !manufacturer.includes(norm(f.cpuBrand))) ok = false;
          if (f.cpuModel && !model.includes(norm(f.cpuModel))) ok = false;

          if (ok) matchedAny = true;
        }

        // GPU
        if (hasGpu && (
          table === 'video_cards' ||
          table === 'gpus' ||
          table === 'graphics_cards' ||
          this.containsAny(this.field(p, 'type', 'category', 'component_type'), ['gpu', 'graphics'])
        )) {
          let ok = true;

          if (f.gpuBrand && !manufacturer.includes(norm(f.gpuBrand))) ok = false;
          if (f.gpuModel && !model.includes(norm(f.gpuModel))) ok = false;

          if (ok) matchedAny = true;
        }

        // RAM
        if (hasRam && (
          table === 'ram' ||
          table === 'memory' ||
          this.containsAny(this.field(p, 'type', 'category', 'component_type'), ['ram', 'memory'])
        )) {
          let ok = true;

          const ramValue = this.field(
            p,
            'capacity_gb',
            'Capacity_GB',
            'capacity',
            'Capacity',
            'memory_capacity'
          );

          if (!matchRange(ramValue, f.ramMin, f.ramMax)) ok = false;

          // ✅ "Memória típus" itt a RAM memory_type legyen
          if (f.storageType) {
            const mt = norm(this.field(
              p,
              'memory_type',
              'MemoryType',
              'type',
              'Type'
            ));

            if (!mt.includes(norm(f.storageType))) ok = false;
          }

          if (ok) matchedAny = true;
        }

        // STORAGE
        if (hasStorage && (
          table === 'storage' ||
          table === 'ssd' ||
          table === 'hdd' ||
          table === 'nvme' ||
          table === 'storage_devices' ||
          this.containsAny(this.field(p, 'type', 'category', 'component_type'), ['storage', 'ssd', 'hdd', 'nvme'])
        )) {
          const storageValue = this.field(
            p,
            'capacity_gb',
            'Capacity_GB',
            'storage_gb',
            'StorageGB',
            'capacity',
            'Capacity'
          );

          if (matchRange(storageValue, f.storageMin, f.storageMax)) {
            matchedAny = true;
          }
        }

        // PSU
        if (hasPsu && (
          table === 'psu' ||
          table === 'power_supply' ||
          table === 'power_supplies' ||
          this.containsAny(this.field(p, 'type', 'category', 'component_type'), ['psu', 'power supply'])
        )) {
          const wattValue = this.field(
            p,
            'wattage',
            'Wattage',
            'watt',
            'Watt'
          );

          if (matchRange(wattValue, f.psuMin, f.psuMax)) {
            matchedAny = true;
          }
        }

        return matchedAny;
      });
    }

    // ---------------- INSTRUMENT ----------------
    if (state.activeCategory === 'instrument') {
      const f: any = (state as any).instrument ?? {};
      const wantTable = norm(f.tableName);
      const wantType = norm(f.itemType);

      return list.filter(p => {
        const table = norm(p.table_name ?? p.table);
        const type = norm((p as any).type ?? this.field(p, 'type') ?? 'instrument');

        if (wantType && wantType !== 'all') {
          if (!type) return false;
          if (type !== wantType) return false;
        }

        if (wantTable && table !== wantTable) return false;

        if (!matchText(this.getManufacturer(p), f.manufacturer)) return false;
        if (!matchText(this.getModel(p), f.model)) return false;

        if (!matchRange(this.getPrice(p), f.minPrice, f.maxPrice)) return false;

        if (f.isUsed === true) {
          const cond = norm(this.field(p, 'condition', 'is_used'));
          if (!(cond.includes('used') || cond === 'true' || cond === '1' || cond.includes('használt'))) return false;
        }

        return true;
      });
    }

    return list;
  }

  /* -----------------------------
     SORT
  ----------------------------- */

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

  /* -----------------------------
     MAIN APPLY
  ----------------------------- */

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

  /* -----------------------------
     STATS
  ----------------------------- */

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
