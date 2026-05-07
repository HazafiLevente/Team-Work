import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { SearchFilters } from '../../../../Models/Filters/searchfilters.model';
import { CarFilters } from '../../../Home/Filterparts/carfilter/carfilter.component';
import { ComputerFilters } from '../../../Home/Filterparts/computerfilter/computerfilter/computerfilter.component';
import { HomeTheaterFiltersV2 as HomeTheaterFilters } from '../../../Home/Filterparts/hometheaterfilter/hometheaterfilter.component';
import { InstrumentFilters } from '../../../Home/Filterparts/instrumentfilter/instrumentfilter.component';

export type CategoryKey = 'all' | 'car' | 'computer' | 'ht' | 'instrument';

export interface CombinedFilters {
  activeCategory: CategoryKey;
  search: SearchFilters;
  car: CarFilters;
  computer: ComputerFilters;
  ht: HomeTheaterFilters;
  instrument: InstrumentFilters;
}

const EMPTY_SEARCH: SearchFilters = {
  term: '',
  manufacturer: '',
  priceMin: null,
  priceMax: null,
  sort: ''
};

const EMPTY_CAR: CarFilters = {
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
  transmission: ''
};

const EMPTY_COMPUTER: ComputerFilters = {
  category: 'computer',
  tableName: '',
  manufacturer: '',
  model: '',
  priceMin: '',
  priceMax: '',
  dynamic: {}
};

const EMPTY_HT: HomeTheaterFilters = {
  category: 'ht',
  tableName: '',
  manufacturer: '',
  model: '',
  priceMin: '',
  priceMax: '',
  dynamic: {}
};

const EMPTY_INSTRUMENT: InstrumentFilters = {
  itemType: 'instrument',
  tableName: '',
  manufacturer: '',
  model: '',
  minPrice: '',
  maxPrice: '',
  isUsed: false
};

@Injectable({ providedIn: 'root' })
export class ProductFiltersService {
  private readonly state$ = new BehaviorSubject<CombinedFilters>({
    activeCategory: 'all',
    search: EMPTY_SEARCH,
    car: EMPTY_CAR,
    computer: EMPTY_COMPUTER,
    ht: EMPTY_HT,
    instrument: EMPTY_INSTRUMENT
  });

  readonly filters$ = this.state$.asObservable();

  get current(): CombinedFilters {
    return this.state$.value;
  }

  private patch(partial: Partial<CombinedFilters>) {
    this.state$.next({
      ...this.state$.value,
      ...partial
    });
  }

  setActiveCategory(activeCategory: CategoryKey) {
    this.patch({ activeCategory });
  }

  setSearch(search: SearchFilters) {
    this.patch({ search });
  }

  setCar(car: CarFilters) {
    this.patch({ car });
  }

  setComputer(computer: ComputerFilters) {
    this.patch({ computer });
  }

  setHt(ht: HomeTheaterFilters) {
    this.patch({ ht });
  }

  setInstrument(instrument: InstrumentFilters) {
    this.patch({ instrument });
  }

  clearAll() {
    this.state$.next({
      activeCategory: 'all',
      search: EMPTY_SEARCH,
      car: EMPTY_CAR,
      computer: EMPTY_COMPUTER,
      ht: EMPTY_HT,
      instrument: EMPTY_INSTRUMENT
    });
  }
}
