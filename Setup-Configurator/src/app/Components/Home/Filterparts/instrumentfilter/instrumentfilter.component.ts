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

@Component({
  selector: 'app-instrumentfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: './instrumentfilter.component.html',
  styleUrls: ['./instrumentfilter.component.css']
})
export class InstrumentfilterComponent implements OnInit, OnDestroy {
  @Output() filtersChange = new EventEmitter<InstrumentFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  meta: any = null;
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

    // ✅ META LOAD (instrument)
    // Ha nálad nem /api/meta van, hanem /meta, akkor írd át erre: '/meta/instruments'
    this.http.get<any>('/api/meta/instruments').subscribe({
      next: (res) => {
        // támogatunk többféle formátumot:
        // 1) { instrument_filter_meta_v1: {...} }
        // 2) [ { instrument_filter_meta_v1: {...} } ]
        // 3) { ... } (maga a meta)
        this.meta =
          res?.instrument_filter_meta_v1 ??
          res?.[0]?.instrument_filter_meta_v1 ??
          res;

        this.loadingMeta = false;
      },
      error: () => {
        this.meta = null;
        this.loadingMeta = false;
      }
    });

    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());

    // ✅ induláskor is küldjük
    this.emitFilters();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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
      itemType: raw.itemType as 'all' | 'instrument' | 'accessory',
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

    this.clearClicked.emit();
    this.emitFilters();
  }
}
