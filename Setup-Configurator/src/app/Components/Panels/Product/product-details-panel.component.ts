import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { Product } from '../../../Models/Product/product.model';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';
import { SetupNoteService, SetupTarget } from '../../Services/Setup/setup-note.service';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-product-details-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-details-panel.component.html',
  styleUrls: ['./product-details-panel.component.css']
})
export class ProductDetailsPanelComponent implements OnChanges, OnDestroy {

  @Input({ required: true }) product!: Product;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc() {
    this.close();
  }

  loading = true;
  error: string | null = null;

  details: any = null;
  setupPickerOpen = false;
  setupTargets: SetupTarget[] = [];
  pickerLoading = false;
  pickerError: string | null = null;
  pickerSuccess: string | null = null;
  savingTargetId: number | null = null;
  noteName = '';
  creatingNote = false;

  detailsKeys: string[] = [];
  trackKey = (_: number, k: string) => k;

  private sub?: Subscription;
  private lastKey = '';

  private prevOverflow = '';
  private scrollLocked = false;

  constructor(
    private productService: ProductService,
    private router: Router,
    private http: HttpClient,
    private setupNote: SetupNoteService
  ) {}

  ngOnChanges(): void {
    const table = this.getTable(this.product);
    const id = this.getId(this.product);
    if (!table || id == null) return;

    const key = `${table}::${id}`;
    if (key === this.lastKey) return;

    this.lastKey = key;

    this.lockScroll();
    this.fetchDetails();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.unlockScroll();
  }

  close() {
    this.unlockScroll();
    this.closed.emit();
  }

  onMore() {
    const table = this.getTable(this.product);
    const id = this.getId(this.product);

    if (!table || id == null) {
      console.warn('onMore: missing table/id', { table, id, product: this.product });
      return;
    }

    this.unlockScroll();
    this.closed.emit();
    this.router.navigate(['/product-site', table, id]);
  }

  onPlus() {
    this.openSetupPicker();
  }

  private obj(p: any): any {
    return p?.data ?? p ?? {};
  }

  private getTable(p: any): string {
    const o = this.obj(p);
    return String(p?.table_name ?? p?.table ?? o?.table_name ?? o?.table ?? '').trim();
  }

  private getId(p: any): any {
    const o = this.obj(p);
    return p?.id ?? p?.ID ?? o?.id ?? o?.ID;
  }

  get displayModel(): string {
    const o = this.obj(this.product as any);
    return String((this.product as any)?.model ?? o?.model ?? o?.Model ?? '').trim();
  }

  get displayManufacturer(): string {
    const o = this.obj(this.product as any);
    return String((this.product as any)?.manufacturer ?? o?.manufacturer ?? o?.Manufacturer ?? '').trim();
  }

  get displayHeading(): string {
    const detailsManufacturer = String(this.details?.manufacturer ?? this.details?.Manufacturer ?? '').trim();
    const detailsModel = String(this.details?.model ?? this.details?.Model ?? this.details?.name ?? '').trim();

    const manufacturer = detailsManufacturer || this.displayManufacturer;
    const model = detailsModel || this.displayModel;

    if (manufacturer && model) {
      if (model.toLowerCase().startsWith(manufacturer.toLowerCase())) return model;
      return `${manufacturer} ${model}`.trim();
    }

    return manufacturer || model || 'Product';
  }

  private fetchDetails() {
    this.loading = true;
    this.error = null;
    this.details = null;
    this.detailsKeys = [];

    this.sub?.unsubscribe();

    const table = this.getTable(this.product);
    const id = this.getId(this.product);

    if (!table || id == null) {
      this.loading = false;
      this.error = 'Hianyzo azonosito (table/id) - nem toltheto be a reszlet.';
      return;
    }

    this.sub = this.productService.getProductDetails(table, id).subscribe({
      next: (res) => {
        const item = this.normalizeDetails(res?.item ?? res);
        this.details = {
          ...this.buildFallbackDetails(),
          ...item
        };
        this.detailsKeys = Object.keys(this.details ?? {});
        this.loading = false;
      },
      error: (err) => {
        console.error(err);

        const fallback = this.buildFallbackDetails();
        if (fallback) {
          this.details = fallback;
          this.detailsKeys = Object.keys(this.details ?? {});
          this.error = null;
        } else {
          this.error = 'Nem sikerult betolteni a termek reszleteit.';
        }

        this.loading = false;
      }
    });
  }

  private buildFallbackDetails(): any {
    const raw = this.obj(this.product as any);
    if (!raw) return null;

    const price = this.extractPrice((this.product as any), raw);

    return {
      ...raw,
      table_name: this.getTable(this.product),
      id: this.getId(this.product),
      manufacturer: this.displayManufacturer,
      model: this.displayModel,
      price
    };
  }

  private normalizeDetails(item: any): any {
    if (!item || typeof item !== 'object') return item;

    return {
      ...item,
      table_name: item.table_name ?? this.getTable(this.product),
      id: item.id ?? item.ID ?? this.getId(this.product),
      manufacturer:
        item.manufacturer ??
        item.Manufacturer ??
        this.displayManufacturer,
      model:
        item.model ??
        item.Model ??
        item.name ??
        item.Name ??
        this.displayModel,
      price: this.extractPrice(item)
    };
  }

  private extractPrice(...sources: any[]): number | string | null {
    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;

      const raw =
        source.price ??
        source.Price ??
        source.price_range ??
        source['Price Range (Ft)'] ??
        source.price_huf ??
        source['Price (Ft)'] ??
        null;

      if (raw == null || raw === '') continue;

      if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : null;
      }

      const nums = (String(raw).match(/\d+(\.\d+)?/g) || [])
        .map(Number)
        .filter(Number.isFinite);

      if (!nums.length) return raw;
      if (nums.length === 1) return Math.round(nums[0]);

      return Math.round((Math.min(...nums) + Math.max(...nums)) / 2);
    }

    return null;
  }

  keysOf(obj: any): string[] {
    return Array.isArray(this.detailsKeys) && this.detailsKeys.length
      ? this.detailsKeys
      : Object.keys(obj ?? {});
  }

  isHiddenKey(k: string): boolean {
    const x = String(k).toLowerCase();
    return x === 'id' || x === 'created_at' || x === 'updated_at'
      || x === 'price' || x === 'price '
      || x === 'table' || x === 'table_name'
      || x === 'name' || x === 'type'
      || x === 'source_table' || x === 'product_table'
      || x === 'category' || x === 'data';
  }

  private lockScroll() {
    if (this.scrollLocked) return;
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('product-details-open');
    this.scrollLocked = true;
  }

  private unlockScroll() {
    if (!this.scrollLocked) return;
    document.body.style.overflow = this.prevOverflow || '';
    document.body.classList.remove('product-details-open');
    this.scrollLocked = false;
  }

  openSetupPicker() {
    this.setupPickerOpen = true;
    this.pickerError = null;
    this.pickerSuccess = null;
    this.loadSetupTargets();
  }

  closeSetupPicker() {
    if (this.savingTargetId) return;
    this.setupPickerOpen = false;
    this.pickerError = null;
    this.pickerSuccess = null;
    this.noteName = '';
  }

  get regularTargets() {
    return this.setupTargets.filter((target) => !target.isFavorite && !target.isNote);
  }

  get favoriteTargets() {
    return this.setupTargets.filter((target) => target.isFavorite && !target.isNote);
  }

  get noteTargets() {
    return this.setupTargets.filter((target) => target.isNote);
  }

  addProductToTarget(target: SetupTarget) {
    const payload = this.setupNote.buildDevicePayload(this.product);

    if (!payload) {
      this.pickerError = 'Hianyzik a termek azonositoja.';
      return;
    }

    this.savingTargetId = target.id;
    this.pickerError = null;
    this.pickerSuccess = null;

    this.setupNote.addProductToTarget(target.id, payload).subscribe({
      next: () => {
        this.savingTargetId = null;
        this.pickerSuccess = `Hozzaadva ide: ${target.name}`;
        setTimeout(() => {
          this.setupPickerOpen = false;
          this.pickerSuccess = null;
        }, 900);
      },
      error: (err) => {
        this.savingTargetId = null;
        this.pickerError = err?.error?.error || 'Nem sikerult hozzaadni a setuphoz.';
      }
    });
  }

  createNoteAndAddProduct() {
    const name = this.noteName.trim();
    const payload = this.setupNote.buildDevicePayload(this.product);

    if (!name) {
      this.pickerError = 'Adj nevet a jegyzetnek.';
      return;
    }

    if (!payload) {
      this.pickerError = 'Hianyzik a termek azonositoja.';
      return;
    }

    this.creatingNote = true;
    this.pickerError = null;
    this.pickerSuccess = null;

    this.setupNote.createNoteAndAddProduct(name, payload).subscribe({
      next: () => {
        this.creatingNote = false;
        this.pickerSuccess = `Jegyzet letrehozva: ${name}`;
        this.noteName = '';
        this.loadSetupTargets();
      },
      error: (err) => {
        this.creatingNote = false;
        this.pickerError = err?.error?.error || err?.message || 'Nem sikerult letrehozni a jegyzetet.';
      }
    });
  }

  private loadSetupTargets() {
    this.pickerLoading = true;
    this.pickerError = null;

    this.setupNote.loadTargets().subscribe({
      next: (targets) => {
        this.setupTargets = targets;
        this.pickerLoading = false;
      },
      error: () => {
        this.pickerLoading = false;
        this.setupTargets = [];
        this.pickerError = 'Nem sikerult betolteni a setup listat.';
      }
    });
  }
}
