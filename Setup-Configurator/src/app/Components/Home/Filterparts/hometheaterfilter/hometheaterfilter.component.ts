import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export type HtDeviceType = '' | 'soundbar' | 'receiver' | 'speaker' | 'tv' | 'projector';

export interface HomeTheaterFilters {
  category: 'ht';

  type: HtDeviceType;
  manufacturer: string;
  model: string;

  minChannels: string;
  maxChannels: string;

  minPower: string;
  maxPower: string;

  bluetooth: boolean;
  wifi: boolean;
  earc: boolean;
}

@Component({
  selector: 'app-hometheaterfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './hometheaterfilter.component.html',
  styleUrls: ['./hometheaterfilter.component.css']
})
export class HometheaterfilterComponent implements OnInit, OnDestroy {

  @Output() filtersChange = new EventEmitter<HomeTheaterFilters>();
  @Output() clearClicked = new EventEmitter<void>();

  form!: FormGroup;
  private sub?: Subscription;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      type: '',
      manufacturer: '',
      model: '',
      minChannels: '',
      maxChannels: '',
      minPower: '',
      maxPower: '',
      bluetooth: false,
      wifi: false,
      earc: false,
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

  private emitFilters(): void {
    const raw = this.form.getRawValue() as any;

    const cleaned: HomeTheaterFilters = {
      category: 'ht',

      type: raw.type || '',
      manufacturer: this.s(raw.manufacturer),
      model: this.s(raw.model),

      minChannels: this.s(raw.minChannels),
      maxChannels: this.s(raw.maxChannels),

      minPower: this.n(raw.minPower),
      maxPower: this.n(raw.maxPower),

      bluetooth: !!raw.bluetooth,
      wifi: !!raw.wifi,
      earc: !!raw.earc,
    };

    this.filtersChange.emit(cleaned);
  }

  clear(): void {
    this.form.reset({
      type: '',
      manufacturer: '',
      model: '',
      minChannels: '',
      maxChannels: '',
      minPower: '',
      maxPower: '',
      bluetooth: false,
      wifi: false,
      earc: false,
    });

    this.clearClicked.emit();
    this.emitFilters();
  }
}
