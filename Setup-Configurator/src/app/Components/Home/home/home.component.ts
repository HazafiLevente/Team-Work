import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SearchbarComponent } from '../searchbar/searchbar.component';
import { FilterlistComponent } from '../Filterparts/filterlist/filterlist.component';
import { ProductlistComponent } from '../ProductParts/productlist/productlist.component';
import { ProductDetailsPanelComponent } from '../../Panels/Product/product-details-panel.component';
import { FeaturedSpotlightComponent } from '../Featured/featured-spotlight.component';

type AnyProduct = any;

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [
    CommonModule,
    SearchbarComponent,
    FilterlistComponent,
    ProductlistComponent,
    FeaturedSpotlightComponent,
    ProductDetailsPanelComponent
  ],
  styleUrl: './home.component.css'
})
export class HomeComponent {
  selectedProduct: AnyProduct | null = null;
  featuredPool: AnyProduct[] = [];

  onOpenProduct(p: AnyProduct) { this.selectedProduct = p; }
  onClosePanel() { this.selectedProduct = null; }

  onProductsChanged(list: AnyProduct[]) {
    this.featuredPool = list || [];
  }
}
