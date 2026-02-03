import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

import { ProductFiltersService, CombinedFilters } from '../../../Services/Home/Shared/product-filters.service';
import { ProductDetailsPanelComponent } from '../../../Panels/Product/product-details-panel.component';

@Component({
  selector: 'app-productlist',
  standalone: true,
  imports: [CommonModule, ProductComponent, ProductDetailsPanelComponent],
  templateUrl: './productlist.component.html',
  styleUrls: ['./productlist.component.css']
})
export class ProductlistComponent implements OnInit, OnDestroy {

  selectedProduct: Product | null = null;

  onOpenProduct(p: Product) {
    this.selectedProduct = p;
  }

  onClosePanel() {
    this.selectedProduct = null;
  }

  allProducts: Product[] = [];
  carProducts: any[] = [];       // autók részletes mezőkkel
  computerProducts: any[] = [];  // ✅ PC részletes mezőkkel
  products: Product[] = [];      // (ha használod máshol, maradhat)

  filteredProducts: Product[] = [];

  loading = true;

  // ha minden kategória kell induláskor, legyen nagyobb
  readonly PRODUCT_LIMIT = 2000;

  private sub?: Subscription;

  constructor(
    private productService: ProductService,
    private filtersService: ProductFiltersService
  ) {}

  ngOnInit(): void {
    this.sub = this.filtersService.filters$.subscribe(f => {
      this.applyFilters(f);
    });

    // 1) all products
    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        this.allProducts = res.items || [];
        this.loading = false;
        this.applyFilters(this.filtersService.current);
      },
      error: err => {
        console.error('API ERROR (products)', err);
        this.loading = false;
      }
    });

    // 2) cars (detailed)
    this.productService.getCars(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        this.carProducts = res.items || [];
        this.applyFilters(this.filtersService.current);
      },
      error: err => console.error('API ERROR (cars)', err)
    });

    // 3) computers (detailed)
    this.productService.getComputers(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        this.computerProducts = res.items || [];
        this.applyFilters(this.filtersService.current);
      },
      error: err => console.error('API ERROR (computers)', err)
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private norm(v: any): string {
    return String(v ?? '').trim();
  }

  private normText(v: any): string {
    return String(v ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private getManufacturer(p: any): string {
    const norm = (v: any) => String(v ?? '').trim();
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

  // ✅ nálatok autóknál table_name van: pl cabrio_cars
  private isCarItem(p: any): boolean {
    const t = String(p?.table_name ?? p?.table ?? '').toLowerCase();
    return t.endsWith('_cars') || t.includes('car');
  }

  private getPriceNumber(p: any): number | null {
    const n = Number(p?.price);
    return Number.isFinite(n) ? n : null;
  }

  private toNum(v: any): number | null {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private getText(p: any): string {
    const model = String(p.model ?? p.Model ?? p.name ?? p.title ?? '').trim();
    const manufacturer = String(p.manufacturer ?? p.Manufacturer ?? '').trim();
    const category = String(p.category ?? p.Category ?? '').trim();
    const desc = String(p.description ?? p.Description ?? '').trim();
    return `${model} ${manufacturer} ${category} ${desc}`.toLowerCase();
  }

  private parseRange(value: any): { min: number | null; max: number | null } {
    if (value == null) return { min: null, max: null };

    const s = String(value).trim();
    if (!s) return { min: null, max: null };

    if (s.endsWith('+')) {
      const n = Number(s.replace('+', '').trim());
      return Number.isFinite(n) ? { min: n, max: null } : { min: null, max: null };
    }

    if (s.toLowerCase().includes('under')) {
      const n = Number(s.replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? { min: null, max: n } : { min: null, max: null };
    }

    if (s.includes('-')) {
      const [aRaw, bRaw] = s.split('-').map(x => x.trim());
      const a = aRaw ? Number(aRaw) : null;
      const b = bRaw ? Number(bRaw) : null;

      const amin = a != null && Number.isFinite(a) ? a : null;
      const bmax = b != null && Number.isFinite(b) ? b : null;

      if (amin != null && bmax != null) {
        return { min: Math.min(amin, bmax), max: Math.max(amin, bmax) };
      }
      return { min: amin, max: bmax };
    }

    const n = Number(s);
    return Number.isFinite(n) ? { min: n, max: n } : { min: null, max: null };
  }

  private getField(p: any, ...keys: string[]): string {
    for (const k of keys) {
      const v = p?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  // ----- CAR field getters -----

  private getBodyType(p: any): string {
    return this.getField(p, 'Body Type', 'body_type', 'bodyType');
  }

  private getFuelType(p: any): string {
    return this.getField(p, 'Fuel Type', 'fuel_type', 'fuel');
  }

  private getTransmission(p: any): string {
    return this.getField(p, 'Transmission', 'transmission', 'gearbox');
  }

  private getHorsepowerRange(p: any): string {
    return this.getField(p, 'Horsepower', 'horsepower', 'hp');
  }

  private getAccelerationRange(p: any): string {
    return this.getField(p, 'Acceleration (s)', 'acceleration', 'accel');
  }

  private getYearRange(p: any): string {
    return this.getField(p, 'Year', 'year');
  }

  private getPriceRange(p: any): string {
    return this.getField(p, 'Price Range (Ft)', 'price_range', 'price_range_ft');
  }

  private mapBodyTypeFromDb(dbValue: any): string {
    const x = this.normText(dbValue);

    if (x === 'kombi') return 'wagon';
    if (x === 'egyeru' || x === 'egyteru') return 'mpv';
    if (x === 'coupe') return 'coupe';
    if (x === 'cabrio') return 'cabrio';
    if (x === 'hatchback') return 'hatchback';
    if (x === 'sedan') return 'sedan';
    if (x === 'suv') return 'suv';

    return x;
  }

  // ----- COMPUTER field getters -----

  private isComputerItem(p: any): boolean {
    const t = String(p?.table_name ?? p?.table ?? '').toLowerCase();
    return (
      t.includes('pc') ||
      t.includes('computer') ||
      t.includes('cpu') ||
      t.includes('gpu') ||
      t.includes('ram') ||
      t.includes('psu') ||
      t.includes('motherboard') ||
      t.includes('storage')
    );
  }

  private getCpuBrand(p: any): string {
    return this.getField(p, 'cpu_brand', 'CPU Brand', 'cpuBrand', 'processor_brand', 'brand_cpu');
  }

  private getCpuModel(p: any): string {
    return this.getField(p, 'cpu_model', 'CPU', 'cpu', 'processor', 'processor_model', 'cpuModel');
  }

  private getGpuBrand(p: any): string {
    return this.getField(p, 'gpu_brand', 'GPU Brand', 'gpuBrand', 'video_brand');
  }

  private getGpuModel(p: any): string {
    return this.getField(p, 'gpu_model', 'GPU', 'gpu', 'video_card', 'gpuModel');
  }

  private getRamGb(p: any): string {
    return this.getField(p, 'ram_gb', 'RAM (GB)', 'ram', 'memory_gb', 'Memory (GB)');
  }

  private getStorageType(p: any): string {
    return this.getField(p, 'storage_type', 'Storage Type', 'storageType', 'drive_type');
  }

  private getStorageGb(p: any): string {
    return this.getField(p, 'storage_gb', 'Storage (GB)', 'storage', 'capacity_gb', 'Drive Size (GB)');
  }

  private getPsuWatt(p: any): string {
    return this.getField(p, 'psu_watt', 'PSU (W)', 'psu', 'wattage', 'Power (W)');
  }

  // -----------------------------
  // MAIN FILTER LOGIC
  // -----------------------------

  private applyFilters(state: CombinedFilters) {
    const s = state.search;

    const term = (s.term || '').toLowerCase().trim();
    const selectedManu = (s.manufacturer || '').toLowerCase().trim();

    // ✅ forráslista kategória szerint
    const source: any[] =
      state.activeCategory === 'car'
        ? (this.carProducts || [])
        : state.activeCategory === 'computer'
          ? (this.computerProducts || [])
          : (this.allProducts || []);

    // 1) alap keresés (term + manufacturer + ár)
    let result = source.filter((p: any) => {
      const manu = this.getManufacturer(p).toLowerCase();
      const hay = this.getText(p);

      const matchText = !term || hay.includes(term);
      const matchManufacturer = !selectedManu || manu === selectedManu;

      const price = this.getPriceNumber(p);
      const hasPrice = price !== null;

      const matchMin = s.priceMin == null || (hasPrice && price! >= s.priceMin);
      const matchMax = s.priceMax == null || (hasPrice && price! <= s.priceMax);

      return matchText && matchManufacturer && matchMin && matchMax;
    });

    // 2) carfilter csak car módban
    if (state.activeCategory === 'car' && state.car) {
      const cf = state.car;

      const cfManu = (cf.manufacturer || '').toLowerCase().trim();
      const cfModel = (cf.model || '').toLowerCase().trim();

      const cfPriceMin = this.toNum(cf.priceMin);
      const cfPriceMax = this.toNum(cf.priceMax);

      const hpMin = this.toNum(cf.hpMin);
      const hpMax = this.toNum(cf.hpMax);

      const accelMin = this.toNum(cf.accelMin);
      const accelMax = this.toNum(cf.accelMax);

      const seatsMin = this.toNum(cf.seatsMin);
      const seatsMax = this.toNum(cf.seatsMax);

      const yearMin = this.toNum(cf.yearMin);
      const yearMax = this.toNum(cf.yearMax);

      result = result.filter((p: any) => {
        const manu = this.getManufacturer(p).toLowerCase();
        const model = String(p.model ?? p.Model ?? '').toLowerCase();

        if (cfManu && !manu.includes(cfManu)) return false;
        if (cfModel && !model.includes(cfModel)) return false;

        const priceR = this.parseRange(this.getPriceRange(p));
        if (cfPriceMin != null && (priceR.max == null || priceR.max < cfPriceMin)) return false;
        if (cfPriceMax != null && (priceR.min == null || priceR.min > cfPriceMax)) return false;

        const hpR = this.parseRange(this.getHorsepowerRange(p));
        if (hpMin != null && (hpR.max == null || hpR.max < hpMin)) return false;
        if (hpMax != null && (hpR.min == null || hpR.min > hpMax)) return false;

        const accR = this.parseRange(this.getAccelerationRange(p));
        if (accelMin != null && (accR.max == null || accR.max < accelMin)) return false;
        if (accelMax != null && (accR.min == null || accR.min > accelMax)) return false;

        const seats = this.toNum(this.getField(p, 'seats', 'Seats'));
        if (seatsMin != null && (seats == null || seats < seatsMin)) return false;
        if (seatsMax != null && (seats == null || seats > seatsMax)) return false;

        const yearR = this.parseRange(this.getYearRange(p));
        if (yearMin != null && (yearR.max == null || yearR.max < yearMin)) return false;
        if (yearMax != null && (yearR.min == null || yearR.min > yearMax)) return false;

        const bodyDb = this.getBodyType(p);
        const body = this.mapBodyTypeFromDb(bodyDb);
        if (cf.bodyType && body !== cf.bodyType) return false;

        const fuel = this.normText(this.getFuelType(p));
        if (cf.fuel && fuel !== this.normText(cf.fuel)) return false;

        const tr = this.normText(this.getTransmission(p));
        if (cf.transmission && tr !== this.normText(cf.transmission)) return false;

        return true;
      });
    }

    // 2/B) computerfilter csak computer módban  ✅ FIX: NEM a car blokkba van ágyazva
    if (state.activeCategory === 'computer' && state.computer) {
      const cf = state.computer;

      const cpuBrand = this.normText(cf.cpuBrand);
      const cpuModel = this.normText(cf.cpuModel);

      const gpuBrand = this.normText(cf.gpuBrand);
      const gpuModel = this.normText(cf.gpuModel);

      const ramMin = this.toNum(cf.ramMin);
      const ramMax = this.toNum(cf.ramMax);

      const storageType = this.normText(cf.storageType);
      const storageMin = this.toNum(cf.storageMin);
      const storageMax = this.toNum(cf.storageMax);

      const psuMin = this.toNum(cf.psuMin);
      const psuMax = this.toNum(cf.psuMax);

      result = result.filter((p: any) => {
        // CPU
        const pCpuBrand = this.normText(this.getCpuBrand(p));
        const pCpuModel = this.normText(this.getCpuModel(p));

        if (cpuBrand && !pCpuBrand.includes(cpuBrand)) return false;
        if (cpuModel && !pCpuModel.includes(cpuModel)) return false;

        // GPU
        const pGpuBrand = this.normText(this.getGpuBrand(p));
        const pGpuModel = this.normText(this.getGpuModel(p));

        if (gpuBrand && pGpuBrand !== gpuBrand) return false;
        if (gpuModel && !pGpuModel.includes(gpuModel)) return false;

        // RAM (GB)
        const ramR = this.parseRange(this.getRamGb(p));
        if (ramMin != null && (ramR.max == null || ramR.max < ramMin)) return false;
        if (ramMax != null && (ramR.min == null || ramR.min > ramMax)) return false;

        // Storage type + size
        const pStType = this.normText(this.getStorageType(p));
        if (storageType && pStType !== storageType) return false;

        const stR = this.parseRange(this.getStorageGb(p));
        if (storageMin != null && (stR.max == null || stR.max < storageMin)) return false;
        if (storageMax != null && (stR.min == null || stR.min > storageMax)) return false;

        // PSU watt
        const psuR = this.parseRange(this.getPsuWatt(p));
        if (psuMin != null && (psuR.max == null || psuR.max < psuMin)) return false;
        if (psuMax != null && (psuR.min == null || psuR.min > psuMax)) return false;

        return true;
      });
    }

    // 3) rendezés
    if (s.sort === 'price_asc') {
      result = [...result].sort((a: any, b: any) => {
        const ap = this.getPriceNumber(a);
        const bp = this.getPriceNumber(b);
        if (ap == null && bp == null) return 0;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return ap - bp;
      });
    } else if (s.sort === 'price_desc') {
      result = [...result].sort((a: any, b: any) => {
        const ap = this.getPriceNumber(a);
        const bp = this.getPriceNumber(b);
        if (ap == null && bp == null) return 0;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return bp - ap;
      });
    } else if (s.sort === 'name_asc') {
      result = [...result].sort((a: any, b: any) =>
        String(a.model ?? '').localeCompare(String(b.model ?? ''), 'hu')
      );
    } else if (s.sort === 'name_desc') {
      result = [...result].sort((a: any, b: any) =>
        String(b.model ?? '').localeCompare(String(a.model ?? ''), 'hu')
      );
    }

    this.filteredProducts = result;
  }
}
