import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-all-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './all-builder-panel.component.html',
  styleUrls: ['./all-builder-panel.component.css']
})
export class AllBuilderPanelComponent implements OnChanges {
  @Input() setup: any;
  @Input() editChildSetupId: number | null = null;
  @Input() initialProductId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  products: any[] = [];
  selectedProductKey = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.resetForm();
      this.loadProductOptions();
    }
    if (changes['initialProductId'] && this.initialProductId != null) {
      this.selectedProductKey = String(this.initialProductId);
    }
    if (this.editChildSetupId && !this.selectedProductKey && !this.loading) {
      this.loadExistingProduct();
    }
  }

  private loadExistingProduct(): void {
    if (!this.editChildSetupId) return;

    this.http.get<any>(`/api/setup/device-link/${this.editChildSetupId}`, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res && res.device_id) {
          this.selectedProductKey = String(res.device_id);
        }
      },
      error: (err) => {
        console.error('❌ Error loading existing product link:', err);
      }
    });
  }

  private resetForm(): void {
    this.selectedProductKey = '';
    this.loading = false;
    this.saving = false;
    this.error = '';
    this.success = '';
  }

  private setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private unwrapProducts(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.products)) return res.products;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.instruments)) return res.instruments;
    return [];
  }

  public getProductKey(prod: any): string {
    return String(prod?.id ?? prod?.ID ?? '');
  }

  private parseProductKey(key: string): number | null {
    const parsedId = key == null || key === '' ? null : Number(key);
    return parsedId == null || Number.isNaN(parsedId) ? null : parsedId;
  }

  loadProductOptions(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    //Lets assume, that there is an endpoint to all of the products request
    //or works similarly to instrument-options but is more comprehensive.
    // Since the task requests all products from the products table:

    this.http.get<any>('/api/setup/all-product-options', { withCredentials: true }).subscribe({
      next: (res) => {
        this.products = this.unwrapProducts(res).map((prod: any) => ({
          ...prod,
          __prodKey: this.getProductKey(prod)
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ product options load error:', err);
        this.error = 'Nem sikerült betölteni a terméklistát.';
        this.loading = false;
      }
    });
  }

  getSelectedProduct(): any | null {
    if (!this.selectedProductKey) return null;
    return this.products.find(prod => prod.__prodKey === this.selectedProductKey) ?? null;
  }

  getProductLabel(prod: any): string {
    return String(
      prod?.name ??
      prod?.display_name ??
      prod?.title ??
      `Termék #${prod?.id ?? '?'}`
    ).trim();
  }

  trackProduct(_: number, prod: any): string {
    return prod?.__prodKey ?? this.getProductKey(prod);
  }

  saveProduct(): void {
    const sid = this.setupId();
    if (!sid) {
      this.error = 'Hiányzik a setup azonosító.';
      return;
    }

    const prodId = this.parseProductKey(this.selectedProductKey);
    if (prodId == null) {
      this.error = 'Válassz egy terméket.';
      return;
    }

    const selected = this.getSelectedProduct();
    if (!selected) {
      this.error = 'A kiválasztott termék nem található.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    // Here the payload type could be 'all' or something more general,
    // but we're going by instrument logic.
    const payload = {
      product_id: prodId,
      type: 'product' // General product type
    };

    const request = this.editChildSetupId
      ? this.http.patch<any>(`/api/setup/replace-child-device/${this.editChildSetupId}`, { product_id: prodId }, { withCredentials: true })
      : this.http.post<any>(`/api/setup/${sid}/add-product`, payload, { withCredentials: true });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.success = this.editChildSetupId ? 'Módosítás sikeresen mentve.' : 'Termék sikeresen hozzáadva.';
        this.saved.emit();
      },
      error: (err) => {
        console.error('❌ product save error:', err);
        this.saving = false;
        this.error = this.editChildSetupId ? 'Nem sikerült elmenteni a módosítást.' : 'Nem sikerült hozzáadni a terméket.';
      }
    });
  }
}
