import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SearchFilters } from '../../../../Models/Filters/searchfilters.model';
import { CarFilters } from '../../../Home/Filterparts/carfilter/carfilter.component';

export type CategoryKey = 'all' | 'car' | 'computer' | 'ht' | 'instrument';

export interface CombinedFilters {
  search: SearchFilters;
  activeCategory: CategoryKey;     // melyik panel aktív
  car?: CarFilters;               // részletes autó filterek
  computer?: any;                 // majd később
}

const DEFAULT_SEARCH: SearchFilters = {
  term: '',
  manufacturer: '',
  priceMin: null,
  priceMax: null,
  sort: ''
};

const DEFAULT_FILTERS: CombinedFilters = {
  search: DEFAULT_SEARCH,
  activeCategory: 'all',   // ✅ EZ A LÉNYEG
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

  /** Carfilter hívja */
  setCar(car: CarFilters) {
    const cur = this._filters$.value;
    const next: CombinedFilters = { ...cur, car };
    this.debug('setCar', next);
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
