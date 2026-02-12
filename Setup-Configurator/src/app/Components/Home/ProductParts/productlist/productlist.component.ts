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
    // figyeljük a filter state-et
    this.sub = this.filtersService.filters$.subscribe(f => this.applyFilters(f));

    // all products
    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe(res => {
      this.allProducts = (res.items || []) as AnyProduct[];
      this.loading = false;
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    // cars
    this.productService.getCars(this.PRODUCT_LIMIT).subscribe(res => {
      this.carProducts = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    // computers
    this.productService.getComputers(this.PRODUCT_LIMIT).subscribe(res => {
      this.computerProducts = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    // home theaters
    this.productService.getHomeTheaters(this.PRODUCT_LIMIT).subscribe(res => {
      this.htProducts = (res.items || []) as AnyProduct[];
      this.emitStats();
      this.applyFilters(this.filtersService.current);
    });

    // instruments
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

  /* -----------------------------
     HELPERS
  ----------------------------- */

  private pcKind(p: AnyProduct): 'cpu' | 'gpu' | 'ram' | 'storage' | 'psu' | 'other' {
    const t = this.norm(this.getTable(p));

    const CPU_TABLES = new Set(['processors', 'cpus']);
    const GPU_TABLES = new Set(['videocards', 'gpus', 'graphics_cards']);
    const RAM_TABLES = new Set(['rams', 'memory', 'ram_modules']);
    const STORAGE_TABLES = new Set(['hdds', 'ssds', 'nvme_ssds', 'storage']);
    const PSU_TABLES = new Set(['psus', 'power_supplies', 'power_supplies_units']);

    if (CPU_TABLES.has(t)) return 'cpu';
    if (GPU_TABLES.has(t)) return 'gpu';
    if (RAM_TABLES.has(t)) return 'ram';
    if (STORAGE_TABLES.has(t)) return 'storage';
    if (PSU_TABLES.has(t)) return 'psu';

    return 'other';
  }

  private inferStorageTypeFromTable(p: AnyProduct): '' | 'hdd' | 'ssd' | 'nvme' {
    const t = this.norm(this.getTable(p));
    if (t.includes('nvme')) return 'nvme';
    if (t.includes('ssd')) return 'ssd';
    if (t.includes('hdd')) return 'hdd';
    return '';
  }

  private norm(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private num(v: any): number | null {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private getTable(p: AnyProduct): string {
    const d = (p as any).data ?? p;
    return String((p as any).table_name ?? (p as any).table ?? d.table_name ?? d.table ?? '').trim();
  }

  private getId(p: AnyProduct): any {
    const d = (p as any).data ?? p;
    return (p as any).id ?? (p as any).ID ?? d.id ?? d.ID;
  }

  private getManufacturer(p: AnyProduct): string {
    const d = (p as any).data ?? p;
    return String((p as any).manufacturer ?? d.manufacturer ?? d.Manufacturer ?? '').trim();
  }

  private getModel(p: AnyProduct): string {
    const d = (p as any).data ?? p;
    return String((p as any).model ?? d.model ?? d.Model ?? '').trim();
  }

  private getPrice(p: AnyProduct): number | null {
    const d = (p as any).data ?? p;
    return this.num((p as any).price ?? d.price ?? d.Price);
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
      default: return this.getAllMerged(); // ✅ ALL
    }
  }

  /* -----------------------------
     SEARCHBAR FILTER
  ----------------------------- */

  private applySearch(list: AnyProduct[], state: CombinedFilters): AnyProduct[] {
    const s: any = (state as any).search ?? {};

    const term = this.norm(s.term);
    const man = this.norm(s.manufacturer);
    const pMin = this.num(s.priceMin);
    const pMax = this.num(s.priceMax);

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
  }

  /* -----------------------------
     DETAILED FILTERS (active category only)
  ----------------------------- */

  /* -----------------------------
   DETAILED FILTERS (active category only)
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

    const get = (p: AnyProduct, key: string) =>
      (p as any)?.[key] ?? (p as any)?.data?.[key];

    const getField = (p: AnyProduct, key: string) => {
      const d = (p as any).data ?? {};
      if (d[key] !== undefined) return d[key];
      if ((p as any)[key] !== undefined) return (p as any)[key];
      return undefined;
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

      // ✅ FIX: hpMin/hpMax a komponensből jön
      const hpMin = toNum(f.hpMin);
      const hpMax = toNum(f.hpMax);

      // ✅ FIX: accelMin/accelMax a komponensből jön
      const accMin = toNum(f.accelMin);
      const accMax = toNum(f.accelMax);

      // ✅ FIX: fuel / bodyType a komponensből jön
      const fuel = norm(f.fuel);
      const trans = norm(f.transmission);
      const body = norm(f.bodyType);

      return list.filter(p => {
        const manu = norm(get(p, 'manufacturer'));
        const model = norm(get(p, 'model'));

        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        const year = toNum(get(p, 'year'));
        if (yearMin != null && (year == null || year < yearMin)) return false;
        if (yearMax != null && (year == null || year > yearMax)) return false;

        const seats = toNum(get(p, 'seats'));
        if (seatsMin != null && (seats == null || seats < seatsMin)) return false;
        if (seatsMax != null && (seats == null || seats > seatsMax)) return false;

        const hp = toNum(get(p, 'horsepower'));
        if (hpMin != null && (hp == null || hp < hpMin)) return false;
        if (hpMax != null && (hp == null || hp > hpMax)) return false;

        const acc = toNum(get(p, 'acceleration'));
        if (accMin != null && (acc == null || acc < accMin)) return false;
        if (accMax != null && (acc == null || acc > accMax)) return false;

        const fuelVal = norm(get(p, 'fuel_type'));
        if (fuel) {
          if (!fuelVal) return false;
          if (!fuelVal.includes(fuel)) return false;
        }

        const transVal = norm(get(p, 'transmission'));
        if (trans && !transVal.includes(trans)) return false;

        const bodyVal = norm(get(p, 'body_type'));
        if (body && !bodyVal.includes(body)) return false;

        return true;
      });
    }

    // ---------------- HT ----------------
    if (state.activeCategory === 'ht') {
      const f: any = (state as any).ht ?? {};

      // közös mezők
      const manF = norm(f.manufacturer);
      const modelF = norm(f.model);



      // ✅ V2 meta-driven forma: tableName/priceMin/priceMax/dynamic
      const hasV2 = ('dynamic' in f) || ('tableName' in f) || ('priceMin' in f);

      return list.filter(p => {
        const manu = norm(getField(p, 'manufacturer'));
        const model = norm(getField(p, 'model'));


        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        // --- V2 (meta-driven)
        if (hasV2) {
          const tableName = norm(f.tableName);
          if (tableName) {
            const t = norm(getField(p, 'table_name'));
            if (t !== tableName) return false;
          }

          // price: p.price vagy data.Price
          const priceVal = getField(p, 'price') ?? getField(p, 'Price');
          if (!matchRange(priceVal, f.priceMin, f.priceMax)) return false;

          const dyn = f.dynamic ?? {};
          for (const key of Object.keys(dyn)) {
            const v = dyn[key];

            // boolean
            if (typeof v === 'boolean') {
              if (!matchBool(getField(p, key), v)) return false;
            }
            // select
            else if (typeof v === 'string') {
              if (v && !matchExact(getField(p, key), v)) return false;
            }
            // range {min,max}
            else if (v && typeof v === 'object') {
              if (!matchRange(getField(p, key), v.min, v.max)) return false;
            }
          }

          return true;
        }

        // --- Régi HT form (a te mostani komponensed)
        const typeWanted = norm(f.type); // nálad: speaker/sub/processor/portable/set
        if (typeWanted) {
          const cat = norm(getField(p, 'category'));
          const table = norm(getField(p, 'table_name'));
          if (!cat.includes(typeWanted) && !table.includes(typeWanted)) return false;
        }

        // booleans
        if (f.bluetooth === true && !matchBool(getField(p, 'bluetooth') ?? getField(p, 'bt'), true)) return false;
        if (f.wifi === true && !matchBool(getField(p, 'wifi') ?? getField(p, 'network') ?? getField(p, 'wlan'), true)) return false;
        if (f.earc === true && !matchBool(getField(p, 'hdmi_earc') ?? getField(p, 'earc'), true)) return false;

        // power
        const powerVal =
          getField(p, 'power_rms_w') ??
          getField(p, 'power_max_w') ??
          getField(p, 'power') ??
          getField(p, 'watt');

        if (!matchRange(powerVal, f.minPower, f.maxPower)) return false;

        // channels
        if (f.minChannels || f.maxChannels) {
          const chVal = getField(p, 'channels');
          // csatornák lehetnek "7.1" stringek -> toNum kivágja az elejét
          if (!matchRange(chVal, f.minChannels, f.maxChannels)) return false;
        }

        return true;
      });
    }

    // ---------------- COMPUTER ----------------
    // ---------------- COMPUTER ----------------
    // ---------------- COMPUTER ----------------
    if (state.activeCategory === 'computer') {
      const f: any = (state as any).computer ?? {};

      return list.filter(p => {
        const table = norm(this.getTable(p));
        const d = (p as any).data ?? {};

        // ---------- CPU (processors) ----------
        if (f.cpuBrand || f.cpuModel) {
          if (table !== 'processors') return false;

          if (f.cpuBrand && !norm(d.manufacturer).includes(norm(f.cpuBrand)))
            return false;

          if (f.cpuModel && !norm(d.Model ?? d.model).includes(norm(f.cpuModel)))
            return false;
        }

        // ---------- GPU (video_cards) ----------
        if (f.gpuBrand || f.gpuModel) {
          if (table !== 'video_cards') return false;

          if (f.gpuBrand && !norm(d.manufacturer).includes(norm(f.gpuBrand)))
            return false;

          if (f.gpuModel && !norm(d.model ?? d.Model).includes(norm(f.gpuModel)))
            return false;
        }

        // ---------- RAM ----------
        if (f.ramMin || f.ramMax) {
          if (table !== 'ram') return false;

          if (!matchRange(d.capacity_gb, f.ramMin, f.ramMax))
            return false;
        }

        // ---------- Storage ----------
        if (f.storageType) {
          const mt = norm(d.memory_type ?? '');
          if (!mt.includes(norm(f.storageType))) return false;
        }

        if (f.storageMin || f.storageMax) {
          if (!matchRange(d.capacity_gb, f.storageMin, f.storageMax))
            return false;
        }

        // ---------- PSU ----------
        if (f.psuMin || f.psuMax) {
          if (table !== 'psu') return false;

          if (!matchRange(d.wattage ?? d.watt, f.psuMin, f.psuMax))
            return false;
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
        const table = norm(getField(p, 'table_name'));
        const type = norm(getField(p, 'type')); // view: instrument/accessory

        if (wantType && wantType !== 'all') {
          if (!type) return false;
          if (type !== wantType) return false;
        }

        if (wantTable && table !== wantTable) return false;

        // plusz keresés a te formodból:
        if (!matchText(getField(p, 'manufacturer'), f.manufacturer)) return false;
        if (!matchText(getField(p, 'model'), f.model)) return false;

        if (!matchRange(getField(p, 'price') ?? getField(p, 'Price'), f.minPrice, f.maxPrice)) return false;

        // isUsed: csak akkor tudsz rá szűrni, ha van ilyen meződ (pl. condition)
        if (f.isUsed === true) {
          const cond = norm(getField(p, 'condition') ?? getField(p, 'is_used'));
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

    let list = source.filter(Boolean);

    // 1) searchbar
    list = this.applySearch(list, state);

    // 2) detailed filters (active category)
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

  private obj(p: AnyProduct): any {
    // A view-kben a részletes mezők általában p.data-ban vannak
    return (p as any).data ?? (p as any);
  }

  private pick(o: any, keys: string[]): any {
    if (!o) return undefined;
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') return o[k];
    }
    return undefined;
  }

  private pickNum(o: any, keys: string[]): number | null {
    const v = this.pick(o, keys);
    if (v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private pickBool(o: any, keys: string[]): boolean {
    const v = this.pick(o, keys);
    if (v === undefined) return false;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase().trim();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'igen';
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
