import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-computerfilter',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './computerfilter.component.html',
  styleUrls: ['./computerfilter.component.css']
})
export class ComputerfilterComponent {

  @Output() filtersChange = new EventEmitter<any>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      brand: '',
      cpu: '',
      gpu: '',
      ramMin: '',
      priceMin: '',
      priceMax: ''
    });

    this.form.valueChanges.subscribe(v => {
      this.filtersChange.emit({
        category: 'computer',
        ...v
      });
    });
  }
}
