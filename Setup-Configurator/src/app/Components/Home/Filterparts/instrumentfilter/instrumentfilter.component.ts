import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface InstrumentFilters {
  // A SQL View 'type' oszlopa: 'instrument' vagy 'accessory'
  itemType: 'all' | 'instrument' | 'accessory';
  // A SQL View 'table_name' oszlopa (pl. 'electric_guitars', 'keyboards')
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
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './instrumentfilter.component.html',
  styleUrls: ['./instrumentfilter.component.css']
})
export class InstrumentfilterComponent implements OnInit, OnDestroy {
  @Output() filtersChange = new EventEmitter<InstrumentFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  form!: FormGroup;
  private sub?: Subscription;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // Alapértelmezetten 'instrument', hogy a PC billentyűzetek ne zavarjanak be az elején
      itemType: 'instrument',
      tableName: '',
      manufacturer: '',
      model: '',
      minPrice: '',
      maxPrice: '',
      isUsed: false
    });

    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(300), // Kicsit emeltem rajta, hogy kíméljük a Supabase-t
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  emitFilters(): void {
    const raw = this.form.getRawValue();

    const cleaned: InstrumentFilters = {
      itemType: raw.itemType as 'all' | 'instrument' | 'accessory',
      tableName: String(raw.tableName || ''),
      manufacturer: String(raw.manufacturer || '').trim(),
      model: String(raw.model || '').trim(),
      minPrice: String(raw.minPrice || ''),
      maxPrice: String(raw.maxPrice || ''),
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
  }
}
