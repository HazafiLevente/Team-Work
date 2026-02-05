import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface InstrumentFilters {
  category: 'instrument';
  type: string;
  manufacturer: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  isUsed: boolean;
  strings?: string; // Gitároknál pl. 6, 7, 12
}

@Component({
  selector: 'app-instrumentfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './instrumentfilter.component.html',
  styleUrls: ['./instrumentfilter.component.css'] // Használhatod a hometheater vagy car css-t
})
export class InstrumentfilterComponent implements OnInit, OnDestroy {
  @Output() filtersChange = new EventEmitter<InstrumentFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  form!: FormGroup;
  private sub?: Subscription;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      type: '',
      manufacturer: '',
      model: '',
      minPrice: '',
      maxPrice: '',
      isUsed: false,
      strings: ''
    });

    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(200),
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
      category: 'instrument',
      type: String(raw.type || ''),
      manufacturer: String(raw.manufacturer || '').trim(),
      model: String(raw.model || '').trim(),
      minPrice: String(raw.minPrice || ''),
      maxPrice: String(raw.maxPrice || ''),
      isUsed: !!raw.isUsed,
      strings: String(raw.strings || '')
    };
    this.filtersChange.emit(cleaned);
  }

  clear(): void {
    this.form.reset({
      type: '', manufacturer: '', model: '',
      minPrice: '', maxPrice: '', isUsed: false, strings: ''
    });
    this.clearClicked.emit();
  }
}
