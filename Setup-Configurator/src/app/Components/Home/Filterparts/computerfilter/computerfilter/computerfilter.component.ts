import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface ComputerMetaV1 {
  table_names: string[];
  manufacturers: string[];
  dynamic_by_table: Record<string, {
    booleans?: string[];
    numbers?: string[];
    enums?: Record<string, string[]>;
  }>;
}

export interface ComputerFilters {
  category: 'computer';
  tableName: string;
  manufacturer: string;
  model: string;
  priceMin: string;
  priceMax: string;
  dynamic: Record<string, boolean | string | { min: string; max: string }>;
}

@Component({
  selector: 'app-computerfilter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './computerfilter.component.html',
  styleUrls: ['./computerfilter.component.css']
})
export class ComputerfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<ComputerFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  meta?: ComputerMetaV1;

  form!: FormGroup;
  dynamicForm!: FormGroup;

  private sub?: Subscription;
  private subTable?: Subscription;

  loading = true;
  error: string | null = null;

  showAdvanced = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('/api/meta/computer').subscribe({
      next: (res) => {
        const meta =
          res?.computer_filter_meta_v1 ??
          res?.[0]?.computer_filter_meta_v1 ??
          res;

        this.meta = meta as ComputerMetaV1;

        this.buildForm();
        this.hookForm();

        this.loading = false;
        this.emitFilters();
      },
      error: (err) => {
        console.error('❌ computer meta load error:', err);
        this.error = 'Computer meta betöltés hiba';

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

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  hasAdvancedControls(): boolean {
    const dyn = this.dynForSelected();
    if (!dyn) return false;

    return !!(
      (dyn.booleans?.length || 0) ||
      (dyn.numbers?.length || 0) ||
      Object.keys(dyn.enums || {}).length
    );
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

    this.subTable = this.form.get('tableName')!.valueChanges.subscribe(() => {
      this.rebuildDynamicControls();
      this.emitFilters();
    });

    this.rebuildDynamicControls();
  }

  private rebuildDynamicControls() {
    Object.keys(this.dynamicForm.controls).forEach(k => this.dynamicForm.removeControl(k));

    const table = this.s(this.form.get('tableName')?.value);
    const dyn = this.meta?.dynamic_by_table?.[table];
    if (!dyn) return;

    const booleans = dyn.booleans ?? [];
    const numbers = dyn.numbers ?? [];
    const enums = dyn.enums ?? {};

    for (const k of booleans) {
      this.dynamicForm.addControl(k, this.fb.control(false));
    }

    for (const k of numbers) {
      this.dynamicForm.addControl(k, this.fb.group({ min: '', max: '' }));
    }

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

  private s(v: any): string {
    return String(v ?? '').trim();
  }

  private n(v: any): string {
    if (v === '' || v == null) return '';
    return String(v).trim();
  }

  emitFilters(): void {
    const raw: any = this.form.getRawValue();

    const cleaned: ComputerFilters = {
      category: 'computer',
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

  dynForSelected() {
    const t = this.s(this.form?.get('tableName')?.value);
    return this.meta?.dynamic_by_table?.[t] ?? null;
  }

  enumKeys(): string[] {
    const dyn = this.dynForSelected();
    return dyn?.enums ? Object.keys(dyn.enums) : [];
  }
}
