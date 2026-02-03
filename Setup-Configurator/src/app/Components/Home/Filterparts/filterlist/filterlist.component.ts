import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CarfilterComponent, CarFilters } from '../carfilter/carfilter.component';
import { ComputerfilterComponent, ComputerFilters } from '../computerfilter/computerfilter.component';

import { ProductFiltersService, CategoryKey } from '../../../Services/Home/Shared/product-filters.service';

@Component({
  selector: 'app-filterlist',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CarfilterComponent,
    ComputerfilterComponent,
    CommonModule
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

    // UI state
    Object.keys(this.active).forEach(k => {
      this.active[k as keyof typeof this.active] = false;
    });
    if (next !== 'all') {
      this.active[next as keyof typeof this.active] = true;
    }

    this.filtersService.setActiveCategory(next);
  }

  onCarChange(data: CarFilters) {
    this.filtersService.setCar(data);
  }

  onComputerChange(data: ComputerFilters) {
    this.filtersService.setComputer(data);
  }
}
