import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

export type PcGpuBrand = '' | 'nvidia' | 'amd' | 'intel';
export type PcStorageType = '' | 'hdd' | 'ssd' | 'nvme';



export interface ComputerFilters {
  category: 'computer';

  cpuBrand: string;
  cpuModel: string;

  gpuBrand: PcGpuBrand;
  gpuModel: string;

  ramMin: string;
  ramMax: string;

  storageType: PcStorageType;
  storageMin: string;
  storageMax: string;

  psuMin: string;
  psuMax: string;
}

@Component({
  selector: 'app-computerfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './computerfilter.component.html',
  styleUrls: ['./computerfilter.component.css']
})
export class ComputerfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<ComputerFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  form!: FormGroup;
  private sub?: Subscription;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      cpuBrand: '',
      cpuModel: '',

      gpuBrand: '',
      gpuModel: '',

      ramMin: '',
      ramMax: '',

      storageType: '',
      storageMin: '',
      storageMax: '',

      psuMin: '',
      psuMax: '',
    });

    this.sub = this.form.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => this.emitFilters());

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



    const cleaned: ComputerFilters = {
      category: 'computer',

      cpuBrand: this.s(raw.cpuBrand),
      cpuModel: this.s(raw.cpuModel),

      gpuBrand: raw.gpuBrand || '',
      gpuModel: this.s(raw.gpuModel),

      ramMin: this.n(raw.ramMin),
      ramMax: this.n(raw.ramMax),

      storageType: raw.storageType || '',
      storageMin: this.n(raw.storageMin),
      storageMax: this.n(raw.storageMax),

      psuMin: this.n(raw.psuMin),
      psuMax: this.n(raw.psuMax),
    };

    this.filtersChange.emit(cleaned);
  }

  isActive(): boolean {
    const v = this.form.getRawValue() as any;
    return Object.values(v).some(x => String(x ?? '').trim().length > 0);
  }

  clear(): void {
    this.form.reset({
      cpuBrand: '',
      cpuModel: '',
      gpuBrand: '',
      gpuModel: '',
      ramMin: '',
      ramMax: '',
      storageType: '',
      storageMin: '',
      storageMax: '',
      psuMin: '',
      psuMax: '',
    });

    this.clearClicked.emit();
    this.emitFilters();
  }


}
