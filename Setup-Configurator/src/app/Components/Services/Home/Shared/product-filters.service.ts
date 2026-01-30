import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SearchFilters } from '../../../../Models/Filters/searchfilters.model';

const DEFAULT_FILTERS: SearchFilters = {
  term: '',
  manufacturer: '',
  priceMin: null,
  priceMax: null,
  sort: ''
};

@Injectable({ providedIn: 'root' })
export class ProductFiltersService {
  private readonly _filters$ = new BehaviorSubject<SearchFilters>(DEFAULT_FILTERS);
  readonly filters$ = this._filters$.asObservable();

  /** DEBUG: hányszor hívták */
  private _setCount = 0;

  setFilters(filters: SearchFilters) {
    this._setCount++;
    console.log(`[FiltersService] setFilters #${this._setCount}`, filters);
    this._filters$.next(filters);
  }

  reset() {
    this._filters$.next(DEFAULT_FILTERS);
  }

  get current(): SearchFilters {
    return this._filters$.value;
  }
}
