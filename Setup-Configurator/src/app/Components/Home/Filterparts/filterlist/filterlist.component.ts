import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Importok bővítése
import { CarfilterComponent, CarFilters } from '../carfilter/carfilter.component';
import { ComputerfilterComponent, ComputerFilters } from '../computerfilter/computerfilter/computerfilter.component';
import { HometheaterfilterComponent, HomeTheaterFilters } from '../hometheaterfilter/hometheaterfilter.component';
import { InstrumentfilterComponent, InstrumentFilters } from '../instrumentfilter/instrumentfilter.component'; // 👈 Ez hiányzott

import { ProductFiltersService, CategoryKey } from '../../../Services/Home/Shared/product-filters.service';

@Component({
  selector: 'app-filterlist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CarfilterComponent,
    ComputerfilterComponent,
    HometheaterfilterComponent,
    InstrumentfilterComponent // 👈 Ezt is be kell tenni az imports tömbbe!
  ],
  templateUrl: './filterlist.component.html',
  styleUrls: ['./filterlist.component.css']
})
export class FilterlistComponent {

  active = {
    car: false,
    computer: false,
    ht: false,
    instrument: false
  };

  constructor(private filtersService: ProductFiltersService) {}

  toggle(key: CategoryKey) {
    const cur = this.filtersService.current.activeCategory;
    const next: CategoryKey = (cur === key) ? 'all' : key;

    // Reseteljük a lokális vizuális állapotot
    Object.keys(this.active).forEach(k => {
      this.active[k as keyof typeof this.active] = false;
    });

    // Beállítjuk az újat, ha nem az 'all' lett kiválasztva
    if (next !== 'all' && next !== 'instrument') {
      // Ha az instrument gombot nyomják meg, az 'instrument' kulcsot is kezelni kell
      this.active[next as keyof typeof this.active] = true;
    } else if (next === 'instrument') {
      this.active.instrument = true;
    }

    this.filtersService.setActiveCategory(next);
  }

  onCarChange(data: CarFilters) {
    this.filtersService.setCar(data);
  }

  onComputerChange(data: ComputerFilters) {
    this.filtersService.setComputer(data);
  }

  onHtChange(data: HomeTheaterFilters) {
    this.filtersService.setHt(data);
  }

  onInstrumentChange(data: InstrumentFilters) {
    this.filtersService.setInstrument(data);
  }
}
