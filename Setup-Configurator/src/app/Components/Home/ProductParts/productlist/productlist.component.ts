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

  onOpenProduct(p: Product) { this.selectedProduct = p; }
  onClosePanel() { this.selectedProduct = null; }

  allProducts: Product[] = [];
  carProducts: any[] = [];
  computerProducts: any[] = [];
  htProducts: any[] = [];
  allInstruments: any[] = [];
  products: Product[] = [];

  filteredProducts: any[] = [];
  loading = true;

  readonly PRODUCT_LIMIT = 2000;
  private sub?: Subscription;

  constructor(
    private productService: ProductService,
    private filtersService: ProductFiltersService
  ) {}

  ngOnInit(): void {
    this.sub = this.filtersService.filters$.subscribe(f => this.applyFilters(f));

    // 1) ALL PRODUCTS
    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        this.allProducts = res.items || [];
        this.loading = false;
        this.applyFilters(this.filtersService.current);
      },
      error: err => { console.error('❌ ALL ERROR', err); this.loading = false; }
    });

    // 2) CARS
    this.productService.getCars(this.PRODUCT_LIMIT).subscribe({
      next: res => { this.carProducts = res.items || []; this.applyFilters(this.filtersService.current); },
      error: err => console.error('❌ CARS ERROR', err)
    });

    // 3) COMPUTERS
    this.productService.getComputers(this.PRODUCT_LIMIT).subscribe({
      next: res => { this.computerProducts = res.items || []; this.applyFilters(this.filtersService.current); },
      error: err => console.error('❌ PCS ERROR', err)
    });

    // 4) HOME THEATERS
    this.productService.getHomeTheaters(this.PRODUCT_LIMIT).subscribe({
      next: res => { this.htProducts = res.items || []; this.applyFilters(this.filtersService.current); },
      error: err => console.error('❌ HT ERROR', err)
    });

    // ✅ 5) INSTRUMENTS (Ezt adtuk hozzá)
    this.productService.getInstruments(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        this.allInstruments = res.items || [];
        console.log('✅ INSTRUMENTS:', this.allInstruments.length);
        this.applyFilters(this.filtersService.current);
      },
      error: err => console.error('❌ INSTRUMENTS ERROR', err)
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // -----------------------------
  // Helpers
  // -----------------------------

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

  private getField(p: any, ...keys: string[]): string {
    for (const k of keys) {
      const v1 = p?.[k];
      if (v1 !== undefined && v1 !== null && String(v1).trim() !== '') return String(v1).trim();

      const v2 = p?.data?.[k];
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== '') return String(v2).trim();

      const kl = String(k).toLowerCase();
      const v3 = p?.data?.[kl];
      if (v3 !== undefined && v3 !== null && String(v3).trim() !== '') return String(v3).trim();
    }
    return '';
  }

  // -----------------------------
  // PC helpers
  // -----------------------------

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

  private mapStorageTypeFromItem(p: any): string {
    const d = p?.data ?? {};
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
          : state.activeCategory === 'ht'
            ? (this.htProducts || [])
            : state.activeCategory === 'instrument' // ✅ ÚJ: Ha hangszer módban vagyunk
              ? (this.allInstruments || [])
              : (this.allProducts || []);


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



    // 2/A) carfilter csak car módban
    if (state.activeCategory === 'car' && state.car) {
      const cf = state.car;

      const manu = this.normText(cf.manufacturer);
      const model = this.normText(cf.model);

      const priceMin = this.toNum(cf.priceMin);
      const priceMax = this.toNum(cf.priceMax);

      const bodyType = this.normText(cf.bodyType);

      const hpMin = this.toNum(cf.hpMin);
      const hpMax = this.toNum(cf.hpMax);

      const accelMin = this.toNum(cf.accelMin);
      const accelMax = this.toNum(cf.accelMax);

      const seatsMin = this.toNum(cf.seatsMin);
      const seatsMax = this.toNum(cf.seatsMax);

      const fuel = this.normText(cf.fuel);

      const yearMin = this.toNum(cf.yearMin);
      const yearMax = this.toNum(cf.yearMax);

      const trans = this.normText(cf.transmission);

      result = result.filter((p: any) => {
        const t = this.normText(p?.table_name ?? '');
        // biztosan csak autó rekord maradjon
        if (!t.includes('car')) return false;

        // manufacturer/model (itt a view-ben lehet Manufacturer/brand stb)
        if (manu) {
          const pm = this.normText(this.getField(p, 'manufacturer', 'Manufacturer', 'brand', 'Brand'));
          if (!pm.includes(manu)) return false;
        }
        if (model) {
          const mdl = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));
          if (!mdl.includes(model)) return false;
        }

        // body type
        if (bodyType) {
          const bt = this.normText(this.getField(p, 'body_type', 'bodyType', 'BodyType', 'type'));
          if (!bt.includes(bodyType)) return false;
        }

        // price
        if (priceMin != null || priceMax != null) {
          const pr = this.toNum(this.getField(p, 'price', 'Price', 'price_huf', 'price_ft'));
          if (priceMin != null && (pr == null || pr < priceMin)) return false;
          if (priceMax != null && (pr == null || pr > priceMax)) return false;
        }

        // horsepower
        if (hpMin != null || hpMax != null) {
          const hp = this.toNum(this.getField(p, 'hp', 'horsepower', 'power_hp', 'loero'));
          if (hpMin != null && (hp == null || hp < hpMin)) return false;
          if (hpMax != null && (hp == null || hp > hpMax)) return false;
        }

        // 0-100 accel (sec)
        if (accelMin != null || accelMax != null) {
          const acc = this.toNum(this.getField(p, 'accel_0_100', 'acceleration_0_100', 'zero_to_hundred', 'accel'));
          if (accelMin != null && (acc == null || acc < accelMin)) return false;
          if (accelMax != null && (acc == null || acc > accelMax)) return false;
        }

        // seats
        if (seatsMin != null || seatsMax != null) {
          const seats = this.toNum(this.getField(p, 'seats', 'seat_count', 'Seats'));
          if (seatsMin != null && (seats == null || seats < seatsMin)) return false;
          if (seatsMax != null && (seats == null || seats > seatsMax)) return false;
        }

        // year
        if (yearMin != null || yearMax != null) {
          const y = this.toNum(this.getField(p, 'year', 'Year', 'model_year'));
          if (yearMin != null && (y == null || y < yearMin)) return false;
          if (yearMax != null && (y == null || y > yearMax)) return false;
        }

        // fuel
        if (fuel) {
          const f = this.normText(this.getField(p, 'fuel', 'Fuel', 'fuel_type', 'fuelType'));
          if (!f.includes(fuel)) return false;
        }

        // transmission
        if (trans) {
          const tr = this.normText(this.getField(p, 'transmission', 'Transmission', 'gearbox', 'gearbox_type'));
          if (!tr.includes(trans)) return false;
        }

        return true;
      });
    }


    // PC részletes filter (computer módban)
    if (state.activeCategory === 'computer' && state.computer) {
      const cf = state.computer;

      const cpuBrand = this.normText(cf.cpuBrand);
      const cpuModel = this.normText(cf.cpuModel);

      const gpuBrand = this.normText(cf.gpuBrand);
      const gpuModel = this.normText(cf.gpuModel);

      const ramMin = this.toNum(cf.ramMin);
      const ramMax = this.toNum(cf.ramMax);

      const storageType = this.normText(cf.storageType);

      const psuMin = this.toNum(cf.psuMin);
      const psuMax = this.toNum(cf.psuMax);

      result = result.filter((p: any) => {
        const t = String(p?.table_name ?? '').toLowerCase();

        if (cpuBrand || cpuModel) {
          if (t !== 'processors') return false;
          const pCpuBrand = this.normText(this.getField(p, 'manufacturer', 'Manufacturer', 'brand'));
          const pCpuModel = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));
          if (cpuBrand && !pCpuBrand.includes(cpuBrand)) return false;
          if (cpuModel && !pCpuModel.includes(cpuModel)) return false;
        }

        if (gpuBrand || gpuModel) {
          if (t !== 'video_cards') return false;
          const inferredBrand = this.mapGpuBrandFromItem(p);
          const pGpuModel = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));
          if (gpuBrand && inferredBrand !== gpuBrand) return false;
          if (gpuModel && !pGpuModel.includes(gpuModel)) return false;
        }

        if (ramMin != null || ramMax != null) {
          if (t !== 'ram') return false;
          const cap = this.toNum(this.getField(p, 'capacity_gb', 'ram_gb', 'memory_gb'));
          if (ramMin != null && (cap == null || cap < ramMin)) return false;
          if (ramMax != null && (cap == null || cap > ramMax)) return false;
        }

        if (storageType) {
          const inferredStorage = this.mapStorageTypeFromItem(p);
          if (inferredStorage && inferredStorage !== storageType) return false;
        }

        if (psuMin != null || psuMax != null) {
          if (t !== 'psu') return false;
          const watt = this.toNum(this.getField(p, 'wattage', 'power_w', 'power', 'watts', 'w'));
          if (psuMin != null && (watt == null || watt < psuMin)) return false;
          if (psuMax != null && (watt == null || watt > psuMax)) return false;
        }

        return true;
      });
    }

    // HT részletes filter (ht módban)
    if (state.activeCategory === 'ht' && state.ht) {
      const hf = state.ht;

      const type = this.normText(hf.type);
      const manu = this.normText(hf.manufacturer);
      const model = this.normText(hf.model);

      const minP = this.toNum(hf.minPower);
      const maxP = this.toNum(hf.maxPower);

      const wantBt = !!hf.bluetooth;
      const wantWifi = !!hf.wifi;
      const wantEarc = !!hf.earc;

      const typeToTables: Record<string, string[]> = {
        speaker: ['front_speaker','back_speaker','side_speaker','center_speakers','ceiling_speakers','floor_speakers'],
        sub: ['subwoofer','bass_shaker','bass_amplifier'],
        processor: ['audio_processors'],
        portable: ['portable_speakers'],
        set: ['home_theater'],
      };

      const isTruthy = (val: any): boolean => {
        if (val === true) return true;
        if (val === false || val == null) return false;
        const ss = this.normText(val);
        return ss === 'true' || ss === '1' || ss === 'yes' || ss === 'y';
      };

      result = result.filter((p: any) => {
        const t = this.normText(p?.table_name ?? p?.table ?? '');

        if (type) {
          const allowed = typeToTables[type] || [];
          if (allowed.length && !allowed.some(x => t.includes(this.normText(x)))) return false;
        }

        if (manu) {
          const pm = this.normText(this.getField(p, 'manufacturer', 'Manufacturer', 'brand', 'Brand'));
          if (!pm.includes(manu)) return false;
        }

        if (model) {
          const mdl = this.normText(this.getField(p, 'model', 'Model', 'name', 'title'));
          if (!mdl.includes(model)) return false;
        }

        if (minP != null || maxP != null) {
          const watt = this.toNum(this.getField(p, 'power_w', 'power', 'watt', 'wattage', 'watts'));
          if (minP != null && (watt == null || watt < minP)) return false;
          if (maxP != null && (watt == null || watt > maxP)) return false;
        }

        if (wantBt) {
          const v = this.getField(p, 'bluetooth', 'bt', 'has_bluetooth', 'supports_bluetooth');
          if (!isTruthy(v)) return false;
        }
        if (wantWifi) {
          const v = this.getField(p, 'wifi', 'has_wifi', 'wireless_wifi', 'supports_wifi');
          if (!isTruthy(v)) return false;
        }
        if (wantEarc) {
          const v = this.getField(p, 'earc', 'hdmi_earc', 'supports_earc');
          if (!isTruthy(v)) return false;
        }

        return true;
      });
    }

    // Az applyFilters végére, a többi if (state.activeCategory === ...) után:

    if (state.activeCategory === 'instrument' && state.instrument) {
      const inf = state.instrument;

      // Szűrő feltételek előkészítése (normText-tel a kis/nagybetű érzéketlenség miatt)
      const filterType = inf.itemType; // 'all' | 'instrument' | 'accessory'
      const filterTableName = inf.tableName; // pl. 'electric_guitars'
      const manu = this.normText(inf.manufacturer);
      const model = this.normText(inf.model);
      const strings = inf.strings ? this.toNum(inf.strings) : null;

      result = result.filter((p: any) => {
        // 1. Kategória szűrés (instrument vagy accessory)
        // A View-ban ez a 'type' oszlopban jön
        if (filterType !== 'all' && p.type !== filterType) return false;

        // 2. Konkrét tábla szűrés (ha a felhasználó választott alkategóriát)
        if (filterTableName && p.table_name !== filterTableName) return false;

        // 3. Gyártó szűrés
        if (manu) {
          // A View-ban már egységesen 'manufacturer' a mezőnév!
          const pm = this.normText(p.manufacturer || '');
          if (!pm.includes(manu)) return false;
        }

        // 4. Modell szűrés
        if (model) {
          // A View-ban már egységesen 'model' a mezőnév!
          const mdl = this.normText(p.model || '');
          if (!mdl.includes(model)) return false;
        }

        // 5. Húrok száma (opcionális, csak ha van ilyen adat)
        if (strings !== null && strings !== 0) {
          const pStrings = this.toNum(p.strings || 0);
          if (pStrings !== strings) return false;
        }

        return true;
      });
    }

    this.filteredProducts = result;

    // extra debug, hogy lásd tényleg van-e találat
    console.log('[ProductList] active=', state.activeCategory, 'source=', source.length, 'filtered=', result.length);
  }
}
