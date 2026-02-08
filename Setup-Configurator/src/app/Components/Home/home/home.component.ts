import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { SearchbarComponent } from '../searchbar/searchbar.component';
import { FilterlistComponent } from '../Filterparts/filterlist/filterlist.component';
import { ProductlistComponent } from '../ProductParts/productlist/productlist.component';
import { FeaturedSpotlightComponent } from '../Featured/featured-spotlight.component';
import { ProductDetailsPanelComponent } from '../../Panels/Product/product-details-panel.component';
import { QuickStatsComponent } from '../../Shared/Stats/quick-stats.component';
import { ClickSparkComponent } from '../../Shared/Effects/click-spark/click-spark.component';

type AnyProduct = any;

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [
    CommonModule,
    SearchbarComponent,
    FilterlistComponent,
    ProductlistComponent,
    FeaturedSpotlightComponent,
    QuickStatsComponent,
    ProductDetailsPanelComponent,
    ClickSparkComponent
  ]
})
export class HomeComponent {

  /* -----------------------------
     UI STATE
  ----------------------------- */

  selectedProduct: AnyProduct | null = null;
  featuredPool: AnyProduct[] = [];

  /* -----------------------------
     QUICK STATS (DB / backend truth)
  ----------------------------- */

  totalAll = 0;
  allCategories: string[] = [];

  constructor(private http: HttpClient) {}

  /* -----------------------------
     PRODUCT DETAILS PANEL
  ----------------------------- */

  onOpenProduct(p: AnyProduct) {
    this.selectedProduct = p;
  }

  onClosePanel() {
    this.selectedProduct = null;
  }

  /* -----------------------------
     SPOTLIGHT POOL (frontend filter)
  ----------------------------- */

  onProductsChanged(list: AnyProduct[]) {
    this.featuredPool = list || [];
  }

  /* -----------------------------
     STATS FROM PRODUCTLIST
     (ideiglenes megoldás – később DB view)
  ----------------------------- */

  onStatsChanged(s: { totalAll: number; categoriesAll: string[] }) {
    this.totalAll = s.totalAll ?? 0;
    this.allCategories = Array.isArray(s.categoriesAll)
      ? s.categoriesAll
      : [];
  }

}
