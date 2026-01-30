import { CarfilterComponent } from '../carfilter/carfilter.component';
import { ComputerfilterComponent } from '../computerfilter/computerfilter.component';
import {Component} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    car: true,
    computer: false,
    ht: false,
    instrument: false
  };

  filters: any = {};

  toggle(key: keyof typeof this.active) {
    Object.keys(this.active).forEach(k =>
      this.active[k as keyof typeof this.active] = false
    );
    this.active[key] = true;
  }

  onCarChange(data: any) {
    this.filters.car = data;
    this.emit();
  }

  onComputerChange(data: any) {
    this.filters.computer = data;
    this.emit();
  }

  emit() {
    console.log('🔎 FILTER PAYLOAD:', this.filters);
  }
}
