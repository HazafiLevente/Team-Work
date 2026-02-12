import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { CarfilterComponent, CarFilters } from '../carfilter/carfilter.component';
import { ComputerfilterComponent, ComputerFilters } from '../computerfilter/computerfilter/computerfilter.component';
import { HometheaterfilterComponent, HomeTheaterFiltersV2 } from '../hometheaterfilter/hometheaterfilter.component';
import { InstrumentfilterComponent, InstrumentFilters } from '../instrumentfilter/instrumentfilter.component';

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
    InstrumentfilterComponent
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

    // reset UI state
    this.active.car = false;
    this.active.computer = false;
    this.active.ht = false;
    this.active.instrument = false;

    // set UI state
    if (next === 'car') this.active.car = true;
    if (next === 'computer') this.active.computer = true;
    if (next === 'ht') this.active.ht = true;
    if (next === 'instrument') this.active.instrument = true;

    this.filtersService.setActiveCategory(next);
  }

  onCarChange(data: CarFilters) {
    this.filtersService.setCar(data);
  }

  onComputerChange(data: ComputerFilters) {
    this.filtersService.setComputer(data);
  }

  onHtChange(data: HomeTheaterFiltersV2) {
    this.filtersService.setHt(data);
  }

  onInstrumentChange(data: InstrumentFilters) {
    this.filtersService.setInstrument(data);
  }
}
