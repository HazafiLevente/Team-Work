import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface HtMetaV1 {
  table_names: string[];
  manufacturers: string[];
  dynamic_by_table: Record<string, {
    booleans?: string[];
    numbers?: string[];
    enums?: Record<string, string[]>;
  }>;
}

export interface HomeTheaterFiltersV2 {
  category: 'ht';
  tableName: string;
  manufacturer: string;
  model: string;
  priceMin: string;
  priceMax: string;
  dynamic: Record<string, boolean | string | { min: string; max: string }>;
}

@Component({
  selector: 'app-hometheaterfilter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './hometheaterfilter.component.html',
  styleUrls: ['./hometheaterfilter.component.css']
})
export class HometheaterfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<HomeTheaterFiltersV2>();
  @Output() clearClicked = new EventEmitter<void>();

  meta?: HtMetaV1;

  form!: FormGroup;
  dynamicForm!: FormGroup;

  private sub?: Subscription;
  private subTable?: Subscription;

  loading = true;
  error: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('/api/meta/ht').subscribe({
      next: (res) => {
        const meta =
          res?.ht_filter_meta_v1 ??
          res?.[0]?.ht_filter_meta_v1 ??
          res;

        this.meta = meta as HtMetaV1;

        this.buildForm();
        this.hookForm();

        this.loading = false;
        this.emitFilters();
      },
      error: (err) => {
        console.error('❌ HT meta load error:', err);
        this.error = 'HT meta betöltés hiba';

        this.meta = { table_names: [], manufacturers: [], dynamic_by_table: {} };
        this.buildForm();
        this.hookForm();

        this.loading = false;
        this.emitFilters();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subTable?.unsubscribe();
  }

  private buildForm() {
    this.dynamicForm = this.fb.group({});

    this.form = this.fb.group({
      tableName: '',
      manufacturer: '',
      model: '',
      priceMin: '',
      priceMax: '',
      dynamic: this.dynamicForm
    });

    // tableName változás -> újraépítjük a dynamic mezőket
    this.subTable = this.form.get('tableName')!.valueChanges.subscribe(() => {
      this.rebuildDynamicControls();
      this.emitFilters();
    });

    // első build
    this.rebuildDynamicControls();
  }

  private rebuildDynamicControls() {
    // töröljük az előző dynamic mezőket
    Object.keys(this.dynamicForm.controls).forEach(k => this.dynamicForm.removeControl(k));

    const table = this.s(this.form.get('tableName')!.value);
    const dyn = this.meta?.dynamic_by_table?.[table];
    if (!dyn) return;

    const booleans = dyn.booleans ?? [];
    const numbers  = dyn.numbers ?? [];
    const enums    = dyn.enums ?? {};

    // boolean: checkbox
    for (const k of booleans) {
      this.dynamicForm.addControl(k, this.fb.control(false));
    }

    // numbers: range min/max
    for (const k of numbers) {
      this.dynamicForm.addControl(k, this.fb.group({ min: '', max: '' }));
    }

    // enums: select
    for (const k of Object.keys(enums)) {
      this.dynamicForm.addControl(k, this.fb.control(''));
    }
  }

  private hookForm() {
    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());
  }

  private s(v: any): string { return String(v ?? '').trim(); }
  private n(v: any): string { return (v === '' || v == null) ? '' : String(v).trim(); }

  emitFilters(): void {
    const raw: any = this.form.getRawValue();

    const cleaned: HomeTheaterFiltersV2 = {
      category: 'ht',
      tableName: this.s(raw.tableName),
      manufacturer: this.s(raw.manufacturer),
      model: this.s(raw.model),
      priceMin: this.n(raw.priceMin),
      priceMax: this.n(raw.priceMax),
      dynamic: raw.dynamic ?? {}
    };

    this.filtersChange.emit(cleaned);
  }

  clear(): void {
    this.form.reset({
      tableName: '',
      manufacturer: '',
      model: '',
      priceMin: '',
      priceMax: '',
      dynamic: {}
    });

    this.rebuildDynamicControls();
    this.clearClicked.emit();
    this.emitFilters();
  }

  // ---- template helper-ek ----

  dynForSelected() {
    const t = this.s(this.form?.get('tableName')?.value);
    return this.meta?.dynamic_by_table?.[t] ?? null;
  }

  enumKeys(): string[] {
    const dyn = this.dynForSelected();
    return dyn?.enums ? Object.keys(dyn.enums) : [];
  }
}
