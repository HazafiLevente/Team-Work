import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

type ProductCategory = {
  key: string;
  label: string;
  icon: string;
  catalogKey: string; // key in /api/home-theater/catalog response
};

const CATEGORIES: ProductCategory[] = [
  { key: 'frontSpeakers',   label: 'Front Hangszóró',     icon: '🔊', catalogKey: 'frontSpeakers' },
  { key: 'backSpeakers',    label: 'Hátsó Hangszóró',     icon: '🔊', catalogKey: 'backSpeakers' },
  { key: 'centerSpeakers',  label: 'Center Hangszóró',    icon: '🔊', catalogKey: 'centerSpeakers' },
  { key: 'sideSpeakers',    label: 'Side Hangszóró',      icon: '🔊', catalogKey: 'sideSpeakers' },
  { key: 'ceilingSpeakers', label: 'Mennyezeti Hangszóró',icon: '🔊', catalogKey: 'ceilingSpeakers' },
  { key: 'floorSpeakers',   label: 'Padló Hangszóró',     icon: '🔊', catalogKey: 'floorSpeakers' },
  { key: 'subwoofers',      label: 'Subwoofer',           icon: '📣', catalogKey: 'subwoofers' },
  { key: 'receivers',       label: 'Receiver / Erősítő',  icon: '📻', catalogKey: 'receivers' },
  { key: 'audioProcessors', label: 'Audio Processzor',    icon: '🎛️', catalogKey: 'audioProcessors' },
  { key: 'bassAmplifiers',  label: 'Bass Erősítő',        icon: '🎚️', catalogKey: 'bassAmplifiers' },
];

// Map catalog key to source_table for backend
const CATALOG_KEY_TO_TABLE: Record<string, string> = {
  frontSpeakers:   'front_speaker[Setup]',
  backSpeakers:    'back_speaker[Setup]',
  centerSpeakers:  'center_speaker[Setup]',
  sideSpeakers:    'side_speaker[Setup]',
  ceilingSpeakers: 'ceiling_speaker[Setup]',
  floorSpeakers:   'floor_speaker[Setup]',
  subwoofers:      'subwoofer[Setup]',
  receivers:       'reciever_setup[Setup]',
  audioProcessors: 'audio_processor[Setup]',
  bassAmplifiers:  'bass_amplifier[Setup]',
};

@Component({
  selector: 'app-add-device-window',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './add-device-window.component.html',
  styleUrls: ['./add-device-window.component.css']
})
export class AddDeviceWindowComponent implements OnInit {
  @Input() setup: any;
  @Output() deviceAdded = new EventEmitter<any>();
  @Output() openBuilder = new EventEmitter<void>();

  categories = CATEGORIES;
  selectedCategory: ProductCategory | null = null;

  allProducts: any[] = [];
  filteredProducts: any[] = [];
  loadingProducts = false;
  searchQuery = '';

  addingId: any = null;
  addSuccess: any = null;
  addError = '';

  private catalogCache: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Preload catalog so navigation is fast
    this.http.get<any>('/api/home-theater/catalog', { withCredentials: true }).subscribe({
      next: (res) => { this.catalogCache = res || {}; },
      error: (err) => console.error('❌ Catalog preload error:', err)
    });
  }

  get setupId(): any {
    return this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
  }

  selectCategory(cat: ProductCategory): void {
    this.selectedCategory = cat;
    this.allProducts = [];
    this.filteredProducts = [];
    this.searchQuery = '';
    this.loadingProducts = true;

    if (this.catalogCache) {
      this.setProducts(cat, this.catalogCache);
    } else {
      this.http.get<any>('/api/home-theater/catalog', { withCredentials: true }).subscribe({
        next: (res) => {
          this.catalogCache = res || {};
          this.setProducts(cat, this.catalogCache);
        },
        error: (err) => {
          console.error('❌ Catalog load error:', err);
          this.loadingProducts = false;
        }
      });
    }
  }

  private setProducts(cat: ProductCategory, catalog: any): void {
    const list = catalog[cat.catalogKey] ?? [];
    this.allProducts = list;
    this.filteredProducts = list;
    this.loadingProducts = false;
  }

  goBack(): void {
    this.selectedCategory = null;
    this.allProducts = [];
    this.filteredProducts = [];
    this.searchQuery = '';
    this.addError = '';
  }

  filterProducts(): void {
    const q = (this.searchQuery || '').toLowerCase();
    if (!q) {
      this.filteredProducts = this.allProducts;
      return;
    }
    this.filteredProducts = this.allProducts.filter(p =>
      (p.manufacturer ?? '').toLowerCase().includes(q) ||
      (p.model ?? '').toLowerCase().includes(q)
    );
  }

  addToSetup(product: any): void {
    const sid = this.setupId;
    if (!sid || !this.selectedCategory) return;

    this.addingId = product.id;
    this.addError = '';

    const sourceTable = CATALOG_KEY_TO_TABLE[this.selectedCategory.catalogKey] ?? this.selectedCategory.catalogKey;

    const payload = {
      product_id: product.id,
      source_table: this.selectedCategory.key,
      display_name: [product.manufacturer, product.model].filter(Boolean).join(' ') || 'Eszköz',
      manufacturer: product.manufacturer ?? ''
    };

    this.http.post<any>(`/api/setup/${sid}/add-device`, payload, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.addingId = null;
          this.addSuccess = product.id;
          this.deviceAdded.emit(res);
          // After adding, open the HT Builder so user can see & move the item
          setTimeout(() => this.openBuilder.emit(), 300);
        },
        error: (err) => {
          console.error('❌ Add device error:', err);
          this.addingId = null;
          this.addError = 'Hozzáadás sikertelen.';
        }
      });
  }

  getProductName(p: any): string {
    return [p.manufacturer, p.model].filter(Boolean).join(' ') || 'Ismeretlen';
  }
}
