import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CarfilterComponent, CarFilters } from '../carfilter/carfilter.component';
import { ComputerfilterComponent } from '../computerfilter/computerfilter.component';
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
    car: false,         // ✅ induláskor NE
    computer: false,
    ht: false,
    instrument: false
  };


  constructor(private filtersService: ProductFiltersService) {}

  toggle(key: CategoryKey) {
    // ha ugyanarra kattintasz, vissza ALL-ra
    const cur = this.filtersService.current.activeCategory;
    const next = (cur === key) ? 'all' : key;

    // UI state (gomb highlight)
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

  onComputerChange(data: any) {
    // majd később: this.filtersService.setComputer(data);
    console.log('computer filters:', data);
  }
}
