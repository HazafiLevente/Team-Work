import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export interface CarFilterMetaV1 {
  table_names: string[];
  manufacturers: string[];
  body_types: string[];
  fuel_types: string[];
  transmissions: string[];
  min_avgprice: number | null;
  max_avgprice: number | null;
}

export interface CarFilters {
  category: 'car';

  tableName: string;
  manufacturer: string;
  model: string;

  priceMin: string;
  priceMax: string;

  bodyType: string;

  hpMin: string;
  hpMax: string;

  accelMin: string;
  accelMax: string;

  seatsMin: string;
  seatsMax: string;

  fuel: string;

  yearMin: string;
  yearMax: string;

  transmission: string;
}

@Component({
  selector: 'app-carfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: './carfilter.component.html',
  styleUrls: ['./carfilter.component.css']
})
export class CarfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<CarFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  meta?: CarFilterMetaV1;

  form!: FormGroup;
  private sub?: Subscription;

  loading = true;
  error: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {}


  ngOnInit(): void {
    this.http.get<any>('/api/meta/cars').subscribe({
      next: (res) => {
        this.meta = res as CarFilterMetaV1;

        this.buildForm();
        this.hookForm();
        this.loading = false;
        this.emitFilters();
      },

      error: (err) => {
        console.log('CAR meta err status:', err.status);
        console.log('CAR meta err body:', err.error);
        this.error = 'Nem sikerült betölteni az autó szűrő meta adatokat.';
        this.meta = {
          table_names: [],
          manufacturers: [],
          body_types: [],
          fuel_types: [],
          transmissions: [],
          min_avgprice: null,
          max_avgprice: null
        };

        this.buildForm();
        this.hookForm();
        this.loading = false;
        this.emitFilters();
      }
    });
  }


  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildForm() {
    this.form = this.fb.group({
      tableName: '',
      manufacturer: '',
      model: '',

      priceMin: '',
      priceMax: '',

      bodyType: '',

      hpMin: '',
      hpMax: '',

      accelMin: '',
      accelMax: '',

      seatsMin: '',
      seatsMax: '',

      fuel: '',

      yearMin: '',
      yearMax: '',

      transmission: '',
    });
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

    const cleaned: CarFilters = {
      category: 'car',

      tableName: this.s(raw.tableName),
      manufacturer: this.s(raw.manufacturer),
      model: this.s(raw.model),

      priceMin: this.n(raw.priceMin),
      priceMax: this.n(raw.priceMax),

      bodyType: this.s(raw.bodyType),

      hpMin: this.n(raw.hpMin),
      hpMax: this.n(raw.hpMax),

      accelMin: this.n(raw.accelMin),
      accelMax: this.n(raw.accelMax),

      seatsMin: this.n(raw.seatsMin),
      seatsMax: this.n(raw.seatsMax),

      fuel: this.s(raw.fuel),

      yearMin: this.n(raw.yearMin),
      yearMax: this.n(raw.yearMax),

      transmission: this.s(raw.transmission),
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
      bodyType: '',
      hpMin: '',
      hpMax: '',
      accelMin: '',
      accelMax: '',
      seatsMin: '',
      seatsMax: '',
      fuel: '',
      yearMin: '',
      yearMax: '',
      transmission: '',
    });

    this.clearClicked.emit();
    this.emitFilters();
  }
}
