import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';

type CarRow = {
  key: string;
  label: string;
  value: any;
};

@Component({
  selector: 'app-setup-car-details-panel',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DragDropModule],
  templateUrl: './setup-car-details-panel.component.html',
  styleUrls: ['./setup-car-details-panel.component.css']
})
export class SetupCarDetailsPanelComponent implements OnChanges {

  @Input() carItem: any = null;
  @Input() boundaryRef: any;

  @Output() close = new EventEmitter<void>();

  loading = false;
  errorMsg = '';
  rows: CarRow[] = [];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['carItem']) {
      this.loadCarDetails();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  title(): string {
    const it = this.carItem;
    return it?.display_name || it?.name || it?.car_name || it?.title || 'Autó';
  }

  private loadCarDetails(): void {
    this.rows = [];
    this.errorMsg = '';
    if (!this.carItem) return;

    // ⚠️ A setup child id gyakran NEM egyezik a car táblák id-jével.
    // Ezért listás endpointnál (items) display_name alapján is keresünk.
    const id =
      this.carItem?.id ??
      this.carItem?.car_id ??
      this.carItem?.item_id ??
      this.carItem?.setup_child_id;

    if (!id) {
      this.rows = this.buildRowsFromItem(this.carItem);
      if (!this.rows.length) this.errorMsg = 'Nincs car ID, és a helyi adatokból sem tudtam mezőket kiolvasni.';
      return;
    }

    this.loading = true;

    // ✅ előre a működőnek tűnő listás endpoint
    const urls = [
      `/api/cars?id=${id}`,
      `/api/car?id=${id}`,
      `/api/setup/cars/${id}`,
      `/api/cars/${id}`,
      `/api/car/${id}`,
      `/api/setup/car/${id}`
    ];

    const tryFetch = (i: number) => {
      if (i >= urls.length) {
        this.rows = this.buildRowsFromItem(this.carItem);
        this.loading = false;
        if (!this.rows.length) {
          this.errorMsg = `Nem találtam működő autó-endpointot, és a carItem sem tartalmaz felismerhető mezőket.`;
        } else {
          this.errorMsg = `Az autó adatok API-ja nem elérhető, ezért a helyi adatokból jelenítem meg.`;
        }
        return;
      }

      const url = urls[i];

      this.http.get<any>(url, { withCredentials: true }).subscribe({
        next: (res) => {
          console.log('[CAR API RES]', url, res);

          const data = this.normalizeCarResponse(res);

          this.rows = this.buildRowsFromItem(data);
          this.loading = false;

          if (!this.rows.length) {
            const fb = this.buildRowsFromItem(this.carItem);
            if (fb.length) {
              this.rows = fb;
              this.errorMsg = `Sikerült választ kapni (${url}), de nem ismert mezők jöttek. Fallback: carItem.`;
            } else {
              this.errorMsg = `Sikerült választ kapni (${url}), de nem találtam ismert mezőket a válaszban.`;
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err?.status === 404) {
            tryFetch(i + 1);
            return;
          }

          console.error('❌ car details hiba:', err);
          this.rows = this.buildRowsFromItem(this.carItem);
          this.loading = false;
          this.errorMsg = `Autó adatok betöltése sikertelen (HTTP ${err?.status ?? '??'}).`;
        }
      });
    };

    tryFetch(0);
  }

  /**
   * Normalizálja a backend választ.
   * FONTOS: ha listát kapunk (items), akkor NEM szabad "első elemet" visszaadni,
   * mert az random (nálad ezért lett PEUGEOT).
   */
  private normalizeCarResponse(res: any): any {
    if (res == null) return res;

    const wantedId =
      this.carItem?.car_id ??
      this.carItem?.item_id ??
      this.carItem?.id ??
      this.carItem?.setup_child_id;

    const wantedTable =
      this.carItem?.table_name ??
      this.carItem?.source_table ??
      this.carItem?.table ??
      this.carItem?.sourceTable ??
      null;

    const wantedTitle = String(
      this.carItem?.display_name ??
      this.carItem?.name ??
      this.carItem?.car_name ??
      this.carItem?.title ??
      ''
    ).trim();

    const norm = (s: any) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

    // ✅ LISTA: { items: [...] }
    if (Array.isArray(res?.items)) {
      const items = res.items;

      // 1) tábla+id egyezés (ha van table_name a listában)
      let hit = items.find((x: any) => {
        const idOk = String(x?.id) === String(wantedId);
        if (!wantedTable) return idOk;
        const t = x?.table_name ?? x?.table ?? x?.source_table;
        return idOk && String(t) === String(wantedTable);
      });

      if (hit) return hit;

      // 2) display_name alapján egyezés:
      //    - manufacturer + model == display_name (vagy tartalmazza)
      if (wantedTitle) {
        const wt = norm(wantedTitle);

        hit = items.find((x: any) => {
          const m = norm(x?.manufacturer ?? x?.brand ?? x?.make);
          const model = norm(x?.model ?? x?.model_name ?? x?.car_model);
          const combo = norm((m && model) ? `${m} ${model}` : '');
          if (combo && combo === wt) return true;
          if (model && (wt.includes(model) || model.includes(wt))) return true;
          return false;
        });

        if (hit) return hit;
      }

      // 3) nincs találat -> SOHA ne adjunk vissza random első elemet
      return this.carItem;
    }

    // ha tömb, de nem wrapper: próbáljunk itt is okosan
    if (Array.isArray(res)) {
      // próbálj id alapján találni
      const hit = res.find((x: any) => String(x?.id) === String(wantedId));
      return hit ?? this.carItem;
    }

    // tipikus wrapper-ek
    let data =
      res?.car ??
      res?.data ??
      res?.result ??
      res?.payload ??
      res?.item ??
      res;

    if (Array.isArray(data)) {
      const hit = data.find((x: any) => String(x?.id) === String(wantedId));
      return hit ?? this.carItem;
    }

    if (data?.car) data = data.car;

    return data;
  }

  /**
   * Case-insensitive, "kulcsnormalizálós" getter
   */
  private getAny(obj: any, keys: string[]): any {
    if (!obj) return undefined;

    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
    }

    const norm = (s: string) => String(s).toLowerCase().replace(/[\s_\-]/g, '');
    const map = new Map<string, string>();
    for (const realKey of Object.keys(obj)) {
      map.set(norm(realKey), realKey);
    }

    for (const k of keys) {
      const hit = map.get(norm(k));
      if (!hit) continue;
      const v = obj[hit];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }

    return undefined;
  }

  private buildRowsFromItem(data: any): CarRow[] {
    if (!data) return [];

    const manufacturer = this.getAny(data, [
      'manufacturer', 'manufacturer_name', 'brand', 'brand_name', 'make', 'maker', 'gyarto', 'gyártó'
    ]);

    const model = this.getAny(data, [
      'model', 'model_name', 'car_model', 'trim', 'variant', 'tipus', 'típus'
    ]);

    // ✅ Price: először "sima" price, ha nincs akkor range
    const exactPrice = this.getAny(data, [
      'price', 'price_ft', 'priceFt', 'car_price', 'carPrice', 'unit_price', 'unitPrice',
      'amount', 'cost', 'ar', 'ár', 'price_value', 'priceValue'
    ]);

    const priceRange = this.getAny(data, [
      'price_range', 'priceRange', 'price_range_ft', 'priceRangeFt',
      'pricerange', 'price range', 'price range (ft)'
    ]);

    const price = (exactPrice ?? priceRange);

    const bodyType = this.getAny(data, [
      'body_type', 'bodyType', 'body', 'type', 'karosszeria', 'karosszéria'
    ]);

    const hp = this.getAny(data, [
      'horsepower', 'hp', 'power', 'horsepower_range', 'teljesitmeny', 'teljesítmény'
    ]);

    const fuel = this.getAny(data, [
      'fuel', 'fuel_type', 'fuelType', 'uzemanyag', 'üzemanyag'
    ]);

    const year = this.getAny(data, [
      'year', 'production_year', 'prodYear', 'ev', 'év'
    ]);

    const candidates: CarRow[] = [
      { key: 'manufacturer', label: 'Manufacturer', value: manufacturer },
      { key: 'model', label: 'Model', value: model },
      { key: 'price', label: 'Price', value: price },
      { key: 'body', label: 'Body Type', value: bodyType },
      { key: 'hp', label: 'Horsepower', value: hp },
      { key: 'fuel', label: 'Fuel', value: fuel },
      { key: 'year', label: 'Year', value: year },
    ];

    return candidates.filter(r => r.value !== undefined && r.value !== null && String(r.value).trim() !== '');
  }
}
