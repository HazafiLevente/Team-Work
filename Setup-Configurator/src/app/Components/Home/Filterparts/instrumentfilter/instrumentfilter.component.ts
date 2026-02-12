import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export interface InstrumentFilters {
  itemType: 'all' | 'instrument' | 'accessory';
  tableName: string;
  manufacturer: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  isUsed: boolean;
}

export interface InstrumentFilterMetaV1 {
  table_names: string[];
  manufacturers: string[];
  min_price: number | null;
  max_price: number | null;
  has_used_flag: boolean;

  // (opcionális) ha később hozzáadod view-ba, ez még jobb:
  has_price?: boolean;
}

@Component({
  selector: 'app-instrumentfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: './instrumentfilter.component.html',
  styleUrls: ['./instrumentfilter.component.css'] // <-- EZ legyen, ne styleUrl
})

export class InstrumentfilterComponent implements OnInit, OnDestroy {
  @Output() filtersChange = new EventEmitter<InstrumentFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  meta: InstrumentFilterMetaV1 | null = null;
  loadingMeta = true;

  form!: FormGroup;
  private sub?: Subscription;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      itemType: 'instrument',
      tableName: '',
      manufacturer: '',
      model: '',
      minPrice: '',
      maxPrice: '',
      isUsed: false
    });

    // META load
    this.http.get<any>('/api/meta/instruments').subscribe({
      next: (res) => {
        const meta =
          res?.instrument_filter_meta_v1 ??
          res?.[0]?.instrument_filter_meta_v1 ??
          res;

        this.meta = meta as InstrumentFilterMetaV1;
        this.loadingMeta = false;

        // okos disable/hide logika:
        this.applyMetaCapabilities();

        // meta után is küldjünk state-et
        this.emitFilters();
      },
      error: (err) => {
        console.error('❌ instrument meta load error:', err);
        this.meta = null;
        this.loadingMeta = false;

        // meta nélkül is működjön alap inputokkal
        this.emitFilters();
      }
    });

    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());

    this.emitFilters();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private applyMetaCapabilities() {
    // Ár: ha min/max null és nincs has_price -> nincs ár adat
    const hasPrice =
      this.meta?.has_price === true ||
      this.meta?.min_price != null ||
      this.meta?.max_price != null;

    if (!hasPrice) {
      this.form.get('minPrice')?.disable({ emitEvent: false });
      this.form.get('maxPrice')?.disable({ emitEvent: false });
      this.form.patchValue({ minPrice: '', maxPrice: '' }, { emitEvent: false });
    } else {
      this.form.get('minPrice')?.enable({ emitEvent: false });
      this.form.get('maxPrice')?.enable({ emitEvent: false });
    }

    // Használt: ha nincs flag, tiltjuk
    const hasUsed = this.meta?.has_used_flag === true;
    if (!hasUsed) {
      this.form.get('isUsed')?.disable({ emitEvent: false });
      this.form.patchValue({ isUsed: false }, { emitEvent: false });
    } else {
      this.form.get('isUsed')?.enable({ emitEvent: false });
    }
  }

  private s(v: any): string {
    return String(v ?? '').trim();
  }

  private n(v: any): string {
    if (v === '' || v == null) return '';
    return String(v).trim();
  }

  emitFilters(): void {
    const raw = this.form.getRawValue() as any;

    const cleaned: InstrumentFilters = {
      itemType: (raw.itemType as any) || 'instrument',
      tableName: this.s(raw.tableName),
      manufacturer: this.s(raw.manufacturer),
      model: this.s(raw.model),
      minPrice: this.n(raw.minPrice),
      maxPrice: this.n(raw.maxPrice),
      isUsed: !!raw.isUsed
    };

    this.filtersChange.emit(cleaned);
  }

  clear(): void {
    this.form.reset({
      itemType: 'instrument',
      tableName: '',
      manufacturer: '',
      model: '',
      minPrice: '',
      maxPrice: '',
      isUsed: false
    });

    // meta tiltások vissza
    if (this.meta) this.applyMetaCapabilities();

    this.clearClicked.emit();
    this.emitFilters();
  }
}
