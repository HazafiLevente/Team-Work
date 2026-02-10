import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type HtDynamicKind = 'select' | 'range' | 'boolean';

export interface HtDynamicFieldMeta {
  key: string;
  kind: HtDynamicKind;
  nonNull: number;
  options: string[];     // select/range esetén is stringek jönnek
  distinct: number;
}

export interface HtFilterMetaV1 {
  price: { min: number | null; max: number | null };
  dynamic: HtDynamicFieldMeta[];
  table_names: string[];
  manufacturers: string[];
}

export interface HomeTheaterFiltersV2 {
  category: 'ht';

  // általános
  tableName: string;       // view/table_name szűrés
  manufacturer: string;    // listából (meta.manufacturers)
  model: string;
  priceMin: string;
  priceMax: string;

  // dinamikus: kulcs -> érték (select: string, boolean: boolean, range: {min,max} string)
  dynamic: Record<string, any>;
}

@Component({
  selector: 'app-hometheaterfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: './hometheaterfilter.component.html',
  styleUrls: ['./hometheaterfilter.component.css']
})
export class HometheaterfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<HomeTheaterFiltersV2>();
  @Output() clearClicked = new EventEmitter<void>();

  meta?: HtFilterMetaV1;

  form!: FormGroup;
  private sub?: Subscription;

  loading = true;
  error: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    // 1) betöltjük a HT meta-t, 2) abból építjük a formot
    // ⚠️ Ha nálad nem /api/meta van mountolva, hanem /meta,
    // akkor cseréld '/api/meta/ht' -> '/meta/ht'
    this.http.get<any>('/api/meta/ht').subscribe({
      next: (res) => {
        /**
         * Backend válasz lehet:
         * 1) { ... }                          (direkt a meta)
         * 2) { ht_filter_meta_v1: { ... } }
         * 3) [ { ht_filter_meta_v1: { ... } } ]
         * ezért robusztusan bontjuk ki
         */
        const meta =
          res?.ht_filter_meta_v1 ??
          res?.[0]?.ht_filter_meta_v1 ??
          res;

        this.meta = meta as HtFilterMetaV1;

        // dinamikus form felépítése a meta alapján
        this.buildForm(this.meta);
        this.hookForm();

        this.loading = false;

        // induláskor is kiküldjük a filter state-et
        this.emitFilters();
      },
      error: (err) => {
        console.error('❌ HT meta load error:', err);

        // fallback: üres meta → ne haljon meg az oldal
        this.meta = {
          price: { min: null, max: null },
          dynamic: [],
          table_names: [],
          manufacturers: []
        } as HtFilterMetaV1;

        this.buildForm(this.meta);
        this.hookForm();

        this.loading = false;
        this.emitFilters();
      }
    });
  }


  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildForm(meta: HtFilterMetaV1) {
    const group: any = {
      tableName: '',
      manufacturer: '',
      model: '',
      priceMin: '',
      priceMax: ''
    };

    // dinamikus mezők
    for (const f of meta.dynamic ?? []) {
      if (f.kind === 'boolean') {
        group[f.key] = false;
      } else if (f.kind === 'select') {
        group[f.key] = '';
      } else if (f.kind === 'range') {
        group[`${f.key}Min`] = '';
        group[`${f.key}Max`] = '';
      }
    }

    this.form = this.fb.group(group);
  }

  private hookForm() {
    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());
  }

  private s(v: any): string {
    return String(v ?? '').trim();
  }
  private n(v: any): string {
    if (v === '' || v == null) return '';
    return String(v).trim();
  }

  emitFilters(): void {
    const raw: any = this.form.getRawValue();

    const dynamic: Record<string, any> = {};
    for (const f of (this.meta?.dynamic ?? [])) {
      if (f.kind === 'boolean') {
        dynamic[f.key] = !!raw[f.key];
      } else if (f.kind === 'select') {
        dynamic[f.key] = this.s(raw[f.key]);
      } else if (f.kind === 'range') {
        dynamic[f.key] = {
          min: this.n(raw[`${f.key}Min`]),
          max: this.n(raw[`${f.key}Max`])
        };
      }
    }

    const cleaned: HomeTheaterFiltersV2 = {
      category: 'ht',
      tableName: this.s(raw.tableName),
      manufacturer: this.s(raw.manufacturer),
      model: this.s(raw.model),
      priceMin: this.n(raw.priceMin),
      priceMax: this.n(raw.priceMax),
      dynamic
    };

    this.filtersChange.emit(cleaned);
  }

  clear(): void {
    const resetObj: any = {
      tableName: '',
      manufacturer: '',
      model: '',
      priceMin: '',
      priceMax: ''
    };

    for (const f of (this.meta?.dynamic ?? [])) {
      if (f.kind === 'boolean') resetObj[f.key] = false;
      if (f.kind === 'select') resetObj[f.key] = '';
      if (f.kind === 'range') {
        resetObj[`${f.key}Min`] = '';
        resetObj[`${f.key}Max`] = '';
      }
    }

    this.form.reset(resetObj);
    this.clearClicked.emit();
    this.emitFilters();
  }

  // UI segéd: range mezők listázása “szép” opciókkal (de input is lehetne)
  rangeOptions(key: string): string[] {
    const f = (this.meta?.dynamic ?? []).find(x => x.key === key);
    return f?.options ?? [];
  }
}
