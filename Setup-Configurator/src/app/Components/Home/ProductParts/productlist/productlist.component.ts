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
  computerProducts: any[] = [];  // ✅ PC részletes mezőkkel (pc_items_view)
  products: Product[] = [];      // (ha használod máshol, maradhat)

  filteredProducts: Product[] = [];

  loading = true;

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

    // 1) ALL PRODUCTS
    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        console.log('✅ all products:', res.items?.length);
        this.allProducts = res.items || [];
        this.loading = false;
        this.applyFilters(this.filtersService.current);
      },
      error: err => {
        console.error('❌ API ERROR (products)', err);
        this.loading = false;
      }
    });

    // 2) CARS
    this.productService.getCars(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        console.log('✅ car products:', res.items?.length, res.items?.slice(0, 3));
        this.carProducts = res.items || [];
        this.applyFilters(this.filtersService.current);
      },
      error: err => console.error('❌ API ERROR (cars)', err)
    });

    // 3) COMPUTERS
    this.productService.getComputers(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        console.log('✅ computer products:', res.items?.length, res.items?.slice(0, 3));
        this.computerProducts = res.items || [];

        // ✅ debug minták (most már tényleg van adat)
        console.log('🖥 sample PC item:', this.computerProducts[0]);
        console.log('🧠 GPU sample:', this.computerProducts.find(x => String(x?.table_name).toLowerCase() === 'video_cards'));
        console.log('⚡ PSU sample:', this.computerProducts.find(x => String(x?.table_name).toLowerCase() === 'psu'));

        this.applyFilters(this.filtersService.current);
      },
      error: err => console.error('❌ API ERROR (computers)', err)
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

  // ✅ ROOT + data JSON olvasás (PC view miatt)
  private getField(p: any, ...keys: string[]): string {
    for (const k of keys) {
      const v1 = p?.[k];
      if (v1 !== undefined && v1 !== null && String(v1).trim() !== '') {
        return String(v1).trim();
      }

      const v2 = p?.data?.[k];
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== '') {
        return String(v2).trim();
      }

      const kl = String(k).toLowerCase();
      const v3 = p?.data?.[kl];
      if (v3 !== undefined && v3 !== null && String(v3).trim() !== '') {
        return String(v3).trim();
      }
    }
    return '';
  }

  // -----------------------------
  // PC OPTION (select) helpers
  // -----------------------------

  // GPU gyártó select: 'nvidia' | 'amd' | 'intel'
  private mapGpuBrandFromItem(p: any): string {
    const t = String(p?.table_name ?? '').toLowerCase();
    if (t !== 'video_cards') return '';

    const manu = this.normText(this.getField(p, 'manufacturer', 'Manufacturer', 'brand'));
    const model = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));
    const hay = `${manu} ${model}`;

    if (hay.includes('nvidia') || hay.includes('geforce') || hay.includes('rtx') || hay.includes('gtx')) return 'nvidia';
    if (hay.includes('amd') || hay.includes('radeon') || hay.includes('rx ')) return 'amd';
    if (hay.includes('intel') || hay.includes('arc')) return 'intel';

    return '';
  }

  // Storage type select: 'nvme' | 'ssd' | 'hdd'  (ha nem azonosítható: '')
  private mapStorageTypeFromItem(p: any): string {
    const d = p?.data ?? {};

    // próbáljunk tipikus mezőkből dolgozni
    const raw = this.normText(
      d.storage_type ??
      d.drive_type ??
      d.type ??
      d.interface ??
      d.form_factor ??
      ''
    );

    if (raw.includes('nvme') || raw.includes('m.2') || raw.includes('pcie')) return 'nvme';
    if (raw.includes('ssd') || raw.includes('sata')) return 'ssd';
    if (raw.includes('hdd') || raw.includes('hard')) return 'hdd';

    return '';
  }

  // -----------------------------
  // MAIN FILTER LOGIC
  // -----------------------------

  private applyFilters(state: CombinedFilters) {
    const s = state.search;

    const term = (s.term || '').toLowerCase().trim();
    const selectedManu = (s.manufacturer || '').toLowerCase().trim();

    const source: any[] =
      state.activeCategory === 'car'
        ? (this.carProducts || [])
        : state.activeCategory === 'computer'
          ? (this.computerProducts || [])
          : (this.allProducts || []);

    // 1) alap keresés
    let result = source.filter((p: any) => {
      const manu = this.getManufacturer(p).toLowerCase();
      const hay = this.getText(p);

      const matchText = !term || hay.includes(term);
      const matchManufacturer = !selectedManu || manu.includes(selectedManu);

      const price = this.getPriceNumber(p);
      const hasPrice = price !== null;

      const matchMin = s.priceMin == null || (hasPrice && price! >= s.priceMin);
      const matchMax = s.priceMax == null || (hasPrice && price! <= s.priceMax);

      return matchText && matchManufacturer && matchMin && matchMax;
    });

    // 2/B) computerfilter csak computer módban
    if (state.activeCategory === 'computer' && state.computer) {
      const cf = state.computer;

      const cpuBrand = this.normText(cf.cpuBrand);
      const cpuModel = this.normText(cf.cpuModel);

      const gpuBrand = this.normText(cf.gpuBrand);       // select value: nvidia/amd/intel
      const gpuModel = this.normText(cf.gpuModel);

      const ramMin = this.toNum(cf.ramMin);
      const ramMax = this.toNum(cf.ramMax);

      const storageType = this.normText(cf.storageType); // select value: nvme/ssd/hdd

      const psuMin = this.toNum(cf.psuMin);
      const psuMax = this.toNum(cf.psuMax);

      result = result.filter((p: any) => {
        const t = String(p?.table_name ?? '').toLowerCase();

        // CPU -> processors
        if (cpuBrand || cpuModel) {
          if (t !== 'processors') return false;

          const pCpuBrand = this.normText(this.getField(p, 'manufacturer', 'Manufacturer', 'brand'));
          const pCpuModel = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));

          if (cpuBrand && !pCpuBrand.includes(cpuBrand)) return false;
          if (cpuModel && !pCpuModel.includes(cpuModel)) return false;
        }

        // GPU -> video_cards
        if (gpuBrand || gpuModel) {
          if (t !== 'video_cards') return false;

          // ✅ GPU brand option fix: RTX/RX/ARC alapján
          const inferredBrand = this.mapGpuBrandFromItem(p);
          const pGpuModel = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));

          if (gpuBrand && inferredBrand !== gpuBrand) return false;
          if (gpuModel && !pGpuModel.includes(gpuModel)) return false;
        }

        // RAM -> ram
        if (ramMin != null || ramMax != null) {
          if (t !== 'ram') return false;

          // nálad RAM: capacity_gb (screenshot alapján)
          const cap = this.toNum(this.getField(p, 'capacity_gb', 'Capacity (GB)', 'ram_gb', 'memory_gb'));
          if (ramMin != null && (cap == null || cap < ramMin)) return false;
          if (ramMax != null && (cap == null || cap > ramMax)) return false;
        }

        // ✅ Storage type option fix:
        // - ha tudjuk azonosítani (nvme/ssd/hdd), akkor szűrünk
        // - ha nem azonosítható az adott itemnél, nem dobjuk ki automatikusan
        if (storageType) {
          const inferredStorage = this.mapStorageTypeFromItem(p);
          if (inferredStorage && inferredStorage !== storageType) return false;
        }

        // PSU -> psu (W)
        if (psuMin != null || psuMax != null) {
          if (t !== 'psu') return false;

          const watt = this.toNum(this.getField(
            p,
            'wattage', 'Wattage',
            'power_w', 'Power (W)',
            'power', 'Power',
            'watts', 'Watts',
            'psu_watt', 'PSU (W)',
            'w'
          ));

          if (psuMin != null && (watt == null || watt < psuMin)) return false;
          if (psuMax != null && (watt == null || watt > psuMax)) return false;
        }

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
        String((a as any).model ?? '').localeCompare(String((b as any).model ?? ''), 'hu')
      );
    } else if (s.sort === 'name_desc') {
      result = [...result].sort((a: any, b: any) =>
        String((b as any).model ?? '').localeCompare(String((a as any).model ?? ''), 'hu')
      );
    }

    this.filteredProducts = result;
  }
}
