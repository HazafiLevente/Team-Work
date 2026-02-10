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

  // ✅ a Productlist ezekre a nevekre fog hivatkozni
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
  minPrice: '',
  maxPrice: '',
  // ha nálad több mező van, maradhatnak itt üresen (TS nem fog összeomlani ha interface bővebb)
} as any;

const EMPTY_COMPUTER: ComputerFilters = {
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
  psuMax: ''
};

const EMPTY_HT: HomeTheaterFilters = {
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
  earc: false
} as any;


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

  // ✅ single source of truth
  current: CombinedFilters = {
    activeCategory: 'all',
    search: { ...EMPTY_SEARCH },
    car: { ...EMPTY_CAR },
    computer: { ...EMPTY_COMPUTER },
    ht: { ...EMPTY_HT },
    instrument: { ...EMPTY_INSTRUMENT }
  };

  private subj = new BehaviorSubject<CombinedFilters>({ ...this.current });
  filters$ = this.subj.asObservable();

  /** Mindig hívjuk, ha változott valami */
  private emit() {
    // fontos: új object reference, hogy minden subscriber reagáljon
    this.subj.next({
      ...this.current,
      search: { ...this.current.search },
      car: { ...(this.current.car as any) },
      computer: { ...this.current.computer },
      ht: { ...this.current.ht },
      instrument: { ...this.current.instrument }
    });

    // DEBUG - ezt nyugodtan hagyd bent, amíg teszteled
    console.log('✅ filters emit:', this.current);
  }

  /* -----------------------------
     CATEGORY
  ----------------------------- */

  setActiveCategory(cat: CategoryKey) {
    this.current.activeCategory = cat;
    this.emit();
  }

  /* -----------------------------
     SEARCHBAR
  ----------------------------- */

  setSearch(s: SearchFilters) {
    this.current.search = {
      ...this.current.search,
      term: (s.term ?? '').trim(),
      manufacturer: (s.manufacturer ?? '').trim(),
      priceMin: s.priceMin ?? null,
      priceMax: s.priceMax ?? null,
      sort: (s.sort ?? '').trim()
    };
    this.emit();
  }

  clearSearch() {
    this.current.search = { ...EMPTY_SEARCH };
    this.emit();
  }

  /* -----------------------------
     DETAILED PANELS
  ----------------------------- */

  setCar(f: CarFilters) {
    this.current.car = { ...(f as any) };
    this.emit();
  }

  setComputer(f: ComputerFilters) {
    this.current.computer = { ...f };
    this.emit();
  }

  setHt(f: HomeTheaterFilters) {
    this.current.ht = { ...f };
    this.emit();
  }

  setInstrument(f: InstrumentFilters) {
    this.current.instrument = { ...f };
    this.emit();
  }

  /* -----------------------------
     FULL RESET (optional)
  ----------------------------- */

  resetAll() {
    this.current = {
      activeCategory: 'all',
      search: { ...EMPTY_SEARCH },
      car: { ...EMPTY_CAR },
      computer: { ...EMPTY_COMPUTER },
      ht: { ...EMPTY_HT },
      instrument: { ...EMPTY_INSTRUMENT }
    };
    this.emit();
  }
}
