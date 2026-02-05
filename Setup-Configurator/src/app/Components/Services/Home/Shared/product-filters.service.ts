import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { SearchFilters } from '../../../../Models/Filters/searchfilters.model';
import { CarFilters } from '../../../Home/Filterparts/carfilter/carfilter.component';
import { ComputerFilters } from '../../../Home/Filterparts/computerfilter/computerfilter/computerfilter.component';
import { HomeTheaterFilters } from '../../../Home/Filterparts/hometheaterfilter/hometheaterfilter.component';
import { InstrumentFilters } from '../../../Home/Filterparts/instrumentfilter/instrumentfilter.component';

export type CategoryKey = 'all' | 'car' | 'computer' | 'ht' | 'instrument';

export interface CombinedFilters {
  search: SearchFilters;
  activeCategory: CategoryKey;
  car?: CarFilters;
  computer?: ComputerFilters;
  ht?: HomeTheaterFilters;
  instrument?: InstrumentFilters; // 👈 Új
}

const DEFAULT_SEARCH: SearchFilters = {
  term: '',
  manufacturer: '',
  priceMin: null,
  priceMax: null,
  sort: ''
};

// EGYETLEN DEFAULT_FILTERS objektum, benne az összes kategóriával
const DEFAULT_FILTERS: CombinedFilters = {
  search: DEFAULT_SEARCH,
  activeCategory: 'all',

  car: {
    category: 'car',
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
  },

  computer: {
    category: 'computer',
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
  },

  ht: {
    category: 'ht',
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
  },

  // Itt az instrument is!
  instrument: {
    category: 'instrument',
    type: '',
    manufacturer: '',
    model: '',
    minPrice: '',
    maxPrice: '',
    isUsed: false,
    strings: ''
  }
};
@Injectable({ providedIn: 'root' })
export class ProductFiltersService {
  private readonly _filters$ = new BehaviorSubject<CombinedFilters>(DEFAULT_FILTERS);
  readonly filters$ = this._filters$.asObservable();

  private _setCount = 0;

  /** Searchbar hívja */
  setSearch(search: SearchFilters) {
    const cur = this._filters$.value;
    const next: CombinedFilters = { ...cur, search };
    this.debug('setSearch', next);
    this._filters$.next(next);
  }

  /** Filterlist hívja (kategória váltás) */
  setActiveCategory(activeCategory: CategoryKey) {
    const cur = this._filters$.value;
    const next: CombinedFilters = { ...cur, activeCategory };
    this.debug('setActiveCategory', next);
    this._filters$.next(next);
  }


  setInstrument(instrument: InstrumentFilters) {
    const cur = this._filters$.value;
    this._filters$.next({ ...cur, instrument });
  }

  /** Carfilter hívja */
  setCar(car: CarFilters) {
    const cur = this._filters$.value;
    const next: CombinedFilters = { ...cur, car };
    this.debug('setCar', next);
    this._filters$.next(next);
  }

  /** Computerfilter hívja */
  setComputer(computer: ComputerFilters) {
    const cur = this._filters$.value;
    const next: CombinedFilters = { ...cur, computer };
    this.debug('setComputer', next);
    this._filters$.next(next);
  }

  /** ✅ Hometheaterfilter hívja */
  setHt(ht: HomeTheaterFilters) {
    const cur = this._filters$.value;
    const next: CombinedFilters = { ...cur, ht };
    this.debug('setHt', next);
    this._filters$.next(next);
  }

  /** ✅ csak HT reset */
  clearHt() {
    const cur = this._filters$.value;
    const next: CombinedFilters = {
      ...cur,
      ht: {
        category: 'ht',
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
      }
    };
    this.debug('clearHt', next);
    this._filters$.next(next);
  }

  resetAll() {
    this.debug('resetAll', DEFAULT_FILTERS);
    this._filters$.next(DEFAULT_FILTERS);
  }

  get current(): CombinedFilters {
    return this._filters$.value;
  }

  private debug(label: string, payload: any) {
    this._setCount++;
    console.log(`[FiltersService] ${label} #${this._setCount}`, payload);
  }
}
