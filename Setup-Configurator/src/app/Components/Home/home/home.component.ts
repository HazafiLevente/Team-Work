import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeaderComponent } from '../../header/header.component';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { FilterlistComponent } from '../Filterparts/filterlist/filterlist.component';
import { ProductlistComponent } from '../ProductParts/productlist/productlist.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [
    CommonModule,
    HeaderComponent,
    SearchbarComponent,
    FilterlistComponent,
    ProductlistComponent
  ],
  styleUrl: './home.component.css'
})
export class HomeComponent {}
