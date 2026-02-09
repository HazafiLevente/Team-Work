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

    // ---------------- CAR (all_cars) ----------------
    if (state.activeCategory === 'car') {
      const f: any = (state as any).car ?? {};

      const manF = norm(f.manufacturer);
      const modelF = norm(f.model);

      const yearMin = toNum(f.yearMin);
      const yearMax = toNum(f.yearMax);

      const seatsMin = toNum(f.seatsMin);
      const seatsMax = toNum(f.seatsMax);

      const hpMin = toNum(f.horsepowerMin);
      const hpMax = toNum(f.horsepowerMax);

      const accMin = toNum(f.accelerationMin);
      const accMax = toNum(f.accelerationMax);

      const fuel = norm(f.fuelType);
      const trans = norm(f.transmission);
      const body = norm(f.bodyType);
      let carType = norm(f.carType);

      // UI-ban SUV -> crossover
      if (carType === 'suv') carType = 'crossover';

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

        // ⛽ fuel: ha van filter, akkor kötelező legyen találni fuel_type-ot
        const fuelVal = norm(get(p, 'fuel_type'));
        if (fuel) {
          if (!fuelVal) return false;
          if (!fuelVal.includes(fuel)) return false;
        }

        const transVal = norm(get(p, 'transmission'));
        if (trans && !transVal.includes(trans)) return false;

        const bodyVal = norm(get(p, 'body_type'));
        if (body && !bodyVal.includes(body)) return false;

        // DB: crossover_cars -> crossover
        let carTypeVal = norm(get(p, 'car_type'));
        if (carTypeVal === 'crossover_cars') carTypeVal = 'crossover';
        if (carTypeVal === 'suv') carTypeVal = 'crossover';

        if (carType && !carTypeVal.includes(carType)) return false;

        return true;
      });
    }

    // ---------------- HT (ht_items_view) ----------------
    if (state.activeCategory === 'ht') {
      const f: any = (state as any).ht ?? {};

      const typeWanted = norm(f.type); // UI: type, view: category
      const manF = norm(f.manufacturer);
      const modelF = norm(f.model);

      return list.filter(p => {
        const manu = norm(get(p, 'manufacturer'));
        const model = norm(get(p, 'model'));

        if (manF && !manu.includes(manF)) return false;
        if (modelF && !model.includes(modelF)) return false;

        if (typeWanted) {
          const cat = norm(get(p, 'category'));
          const table = norm(get(p, 'table_name'));
          if (!cat.includes(typeWanted) && !table.includes(typeWanted)) return false;
        }

        const d = (p as any).data ?? {};
        const has = (key: string) => {
          const v = d[key];
          if (typeof v === 'boolean') return v;
          const s = norm(v);
          return s === 'true' || s === '1' || s === 'yes' || s === 'igen';
        };

        if (f.bluetooth === true && !(has('bluetooth') || has('bt'))) return false;
        if (f.wifi === true && !(has('wifi') || has('WiFi') || has('wlan'))) return false;
        if (f.earc === true && !(has('earc') || has('hdmi_earc') || has('eArc'))) return false;

        const power = toNum(d.power ?? d.power_w ?? d.watt ?? d.rms_w);
        const pMin = toNum(f.minPower);
        const pMax = toNum(f.maxPower);
        if (pMin != null && (power == null || power < pMin)) return false;
        if (pMax != null && (power == null || power > pMax)) return false;

        return true;
      });
    }

    // ---------------- COMPUTER (pc_items_view) ----------------
    if (state.activeCategory === 'computer') {
      const f: any = (state as any).computer ?? {};

      return list.filter(p => {
        const d = (p as any).data ?? {};

        const cpuBrand = norm(f.cpuBrand);
        const cpuModel = norm(f.cpuModel);
        const gpuBrand = norm(f.gpuBrand);
        const gpuModel = norm(f.gpuModel);

        const hay1 = norm(`${d.Socket ?? ''} ${d.chipset ?? ''} ${d.series ?? ''} ${d.variant ?? ''} ${d.notes ?? ''} ${get(p,'manufacturer') ?? ''}`);
        const hay2 = norm(`${d.Model ?? ''} ${d.model ?? ''} ${d.product_code ?? ''} ${get(p,'model') ?? ''}`);

        if (cpuBrand && !hay1.includes(cpuBrand)) return false;
        if (cpuModel && !hay2.includes(cpuModel)) return false;

        if (gpuBrand && !(hay1.includes(gpuBrand) || hay2.includes(gpuBrand))) return false;
        if (gpuModel && !hay2.includes(gpuModel)) return false;

        const cap = toNum(d.capacity_gb);
        const ramMin = toNum(f.ramMin);
        const ramMax = toNum(f.ramMax);
        if (ramMin != null && (cap == null || cap < ramMin)) return false;
        if (ramMax != null && (cap == null || cap > ramMax)) return false;

        const st = norm(f.storageType);
        if (st) {
          const mt = norm(d.memory_type);
          if (mt && !mt.includes(st)) return false;
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
        const table = norm(get(p, 'table_name'));
        const type = norm(get(p, 'type')); // view-oszlop: instrument/accessory

        if (wantType && wantType !== 'all') {
          if (!type) return false;
          if (type !== wantType) return false;
        }

        if (wantTable && table !== wantTable) return false;

        return true;
      });
    }

    // default: nincs extra részletes filter
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
