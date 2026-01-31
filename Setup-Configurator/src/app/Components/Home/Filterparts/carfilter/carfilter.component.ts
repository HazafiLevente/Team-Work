import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

export type BodyType =
  | '' | 'hatchback' | 'coupe' | 'cabrio' | 'wagon' | 'mpv' | 'sedan' | 'suv';

export type FuelType =
  | '' | 'hybrid' | 'petrol' | 'diesel' | 'electric';

export type TransmissionType =
  | '' | 'manual' | 'automatic';

export interface CarFilters {
  category: 'car';

  manufacturer: string;
  model: string;
  priceMin: string;
  priceMax: string;
  bodyType: BodyType;
  hpMin: string;
  hpMax: string;
  accelMin: string;
  accelMax: string;
  seatsMin: string;
  seatsMax: string;
  fuel: FuelType;
  yearMin: string;
  yearMax: string;
  transmission: TransmissionType;
}


@Component({
  selector: 'app-carfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './carfilter.component.html',
  styleUrls: ['./carfilter.component.css']
})
export class CarfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<CarFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  form!: FormGroup;
  private sub?: Subscription;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
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

    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());

    // induláskor is küldjük ki a defaultot (opcionális)
    this.emitFilters();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private s(v: any): string {
    // stringes mezők tisztítása
    return String(v ?? '').trim();
  }

  private n(v: any): string {
    // number inputokból jöhet number vagy '' vagy null
    // mi stringet tárolunk a filterben, hogy a parseRange/toNum tudja kezelni
    if (v === '' || v == null) return '';
    return String(v).trim();
  }



  emitFilters(): void {
    const raw = this.form.getRawValue() as any;

    const cleaned: CarFilters = {
      category: 'car',

      manufacturer: this.s(raw.manufacturer),
      model: this.s(raw.model),

      priceMin: this.n(raw.priceMin),
      priceMax: this.n(raw.priceMax),

      bodyType: raw.bodyType || '',

      hpMin: this.n(raw.hpMin),
      hpMax: this.n(raw.hpMax),

      accelMin: this.n(raw.accelMin),
      accelMax: this.n(raw.accelMax),

      seatsMin: this.n(raw.seatsMin),
      seatsMax: this.n(raw.seatsMax),

      fuel: raw.fuel || '',

      yearMin: this.n(raw.yearMin),
      yearMax: this.n(raw.yearMax),

      transmission: raw.transmission || '',
    };

    this.filtersChange.emit(cleaned);
  }


  isActive(): boolean {
    const v = this.form.getRawValue() as CarFilters;
    return Object.values(v).some(x => String(x ?? '').trim().length > 0);
  }

  clear(): void {
    this.form.reset({
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
