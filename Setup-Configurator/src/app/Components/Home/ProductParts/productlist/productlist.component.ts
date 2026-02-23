import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

import { ProductFiltersService, CombinedFilters } from '../../../Services/Home/Shared/product-filters.service';
import { normalizeProduct } from '../../../Services/Home/Shared/product-normalizer';
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
  ) { }

  ngOnInit(): void {
    this.sub = this.filtersService.filters$.subscribe(f => this.applyFilters(f));

    // all products
    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe(res => {
      this.allProducts = normalizeList(res.items || []);
      this.loading = false;
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getCars(this.PRODUCT_LIMIT).subscribe(res => {
      this.carProducts = normalizeList(res.items || []);
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getComputers(this.PRODUCT_LIMIT).subscribe(res => {
      this.computerProducts = normalizeList(res.items || []);
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getHomeTheaters(this.PRODUCT_LIMIT).subscribe(res => {
      this.htProducts = normalizeList(res.items || []);
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    this.productService.getInstruments(this.PRODUCT_LIMIT).subscribe(res => {
      this.allInstruments = normalizeList(res.items || []);
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

  /* -----------------------------
     UTILS (always read from normalized fields)
  ----------------------------- */

  private norm(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private getTable(p: AnyProduct): string {
    return String(p.table_name ?? p.table ?? '').trim();
  }

  private getId(p: AnyProduct): any {
    return p.id;
  }

  private getManufacturer(p: AnyProduct): string {
    return String(p.manufacturer ?? '').trim();
  }

  private getModel(p: AnyProduct): string {
    return String(p.model ?? '').trim();
  }

  private getPrice(p: AnyProduct): number | null {
    const n = p.price;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
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
     (meghagytam a te logikád nagy részét, de normalized adatokra támaszkodik)
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
    if (state.activeCategory === 'car') {
      const f: any = (state as any).car ?? {};

      const manF = norm(f.manufacturer);
      const modelF = norm(f.model);

      const yearMin = toNum(f.yearMin);
      const yearMax = toNum(f.yearMax);

      const seatsMin = toNum(f.seatsMin);
      const seatsMax = toNum(f.seatsMax);

      const hpMin = toNum(f.hpMin);
      const hpMax = toNum(f.hpMax);

      const accMin = toNum(f.accelMin);
      const accMax = toNum(f.accelMax);

      const fuel = norm(f.fuel);
      const trans = norm(f.transmission);
      const body = norm(f.bodyType);

      return list.filter(p => {
        const d = (p as any).data ?? {};

        const manu = norm(p.manufacturer);
        const model = norm(p.model);

        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        const year = toNum(d.year ?? d.Year);
        if (yearMin != null && (year == null || year < yearMin)) return false;
        if (yearMax != null && (year == null || year > yearMax)) return false;

        const seats = toNum(d.seats ?? d.Seats);
        if (seatsMin != null && (seats == null || seats < seatsMin)) return false;
        if (seatsMax != null && (seats == null || seats > seatsMax)) return false;

        const hp = toNum(d.horsepower ?? d.Horsepower);
        if (hpMin != null && (hp == null || hp < hpMin)) return false;
        if (hpMax != null && (hp == null || hp > hpMax)) return false;

        const acc = toNum(d.acceleration ?? d.Acceleration);
        if (accMin != null && (acc == null || acc < accMin)) return false;
        if (accMax != null && (acc == null || acc > accMax)) return false;

        const fuelVal = norm(d.fuel_type ?? d.FuelType ?? d.fuel);
        if (fuel) {
          if (!fuelVal) return false;
          if (!fuelVal.includes(fuel)) return false;
        }

        const transVal = norm(d.transmission ?? d.Transmission);
        if (trans && !transVal.includes(trans)) return false;

        const bodyVal = norm(d.body_type ?? d.BodyType ?? d.body);
        if (body && !bodyVal.includes(body)) return false;

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
        const d = (p as any).data ?? {};

        const manu = norm(p.manufacturer);
        const model = norm(p.model);

        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        // V2
        if (hasV2) {
          const tableName = norm(f.tableName);
          if (tableName) {
            const t = norm(p.table_name);
            if (t !== tableName) return false;
          }

          // ár: már normalized, de a range filter a state-ből jön
          if (!matchRange(p.price, f.priceMin, f.priceMax)) return false;

          const dyn = f.dynamic ?? {};
          for (const key of Object.keys(dyn)) {
            const v = dyn[key];

            const field = (d as any)[key] ?? (p as any)[key];

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

        // régi HT
        if (f.bluetooth === true && !matchBool(d.bluetooth ?? d.bt, true)) return false;
        if (f.wifi === true && !matchBool(d.wifi ?? d.network ?? d.wlan, true)) return false;
        if (f.earc === true && !matchBool(d.hdmi_earc ?? d.earc, true)) return false;

        const powerVal = d.power_rms_w ?? d.power_max_w ?? d.power ?? d.watt;
        if (!matchRange(powerVal, f.minPower, f.maxPower)) return false;

        if (f.minChannels || f.maxChannels) {
          if (!matchRange(d.channels, f.minChannels, f.maxChannels)) return false;
        }

        return true;
      });
    }

    // ---------------- COMPUTER ----------------
    if (state.activeCategory === 'computer') {
      const f: any = (state as any).computer ?? {};

      return list.filter(p => {
        const table = norm(p.table_name);
        const d = (p as any).data ?? {};

        if (f.cpuBrand || f.cpuModel) {
          if (table !== 'processors') return false;
          if (f.cpuBrand && !norm(d.manufacturer).includes(norm(f.cpuBrand))) return false;
          if (f.cpuModel && !norm(d.Model ?? d.model).includes(norm(f.cpuModel))) return false;
        }

        if (f.gpuBrand || f.gpuModel) {
          if (table !== 'video_cards') return false;
          if (f.gpuBrand && !norm(d.manufacturer).includes(norm(f.gpuBrand))) return false;
          if (f.gpuModel && !norm(d.model ?? d.Model).includes(norm(f.gpuModel))) return false;
        }

        if (f.ramMin || f.ramMax) {
          if (table !== 'ram') return false;
          if (!matchRange(d.capacity_gb, f.ramMin, f.ramMax)) return false;
        }

        if (f.storageType) {
          const mt = norm(d.memory_type ?? '');
          if (!mt.includes(norm(f.storageType))) return false;
        }

        if (f.storageMin || f.storageMax) {
          if (!matchRange(d.capacity_gb, f.storageMin, f.storageMax)) return false;
        }

        if (f.psuMin || f.psuMax) {
          if (table !== 'psu') return false;
          if (!matchRange(d.wattage ?? d.watt, f.psuMin, f.psuMax)) return false;
        }

        return true;
      });
    }

    // ---------------- INSTRUMENT ----------------
    if (state.activeCategory === 'instrument') {
      const f: any = (state as any).instrument ?? {};
      const wantTable = norm(f.tableName);
      const wantType = norm(f.itemType); // instrument | accessory | all

      return list.filter(p => {
        const d = (p as any).data ?? {};

        const table = norm(p.table_name);
        const type = norm(p.type ?? d.type);

        if (wantType && wantType !== 'all') {
          if (!type) return false;
          if (type !== wantType) return false;
        }

        if (wantTable && table !== wantTable) return false;

        if (!matchText(p.manufacturer, f.manufacturer)) return false;
        if (!matchText(p.model, f.model)) return false;

        if (!matchRange(p.price, f.minPrice, f.maxPrice)) return false;

        if (f.isUsed === true) {
          const cond = norm(d.condition ?? d.is_used);
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

    // 1) searchbar
    let list = this.applySearch(source.filter(Boolean), state);

    // 2) detailed
    list = this.applyDetailed(list, state);

    // 3) sort
    list = this.applySort(list, state);

    this.filteredProducts = list;

    // pagination reset
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

    const cats = new Set<string>();
    map.forEach(p => cats.add(this.getTable(p) || ''));

    this.statsChanged.emit({
      totalAll: map.size,
      categoriesAll: Array.from(cats).filter(Boolean).sort()
    });
  }
}
