import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { SearchbarComponent } from '../searchbar/searchbar.component';
import { FilterlistComponent } from '../Filterparts/filterlist/filterlist.component';
import { ProductlistComponent } from '../ProductParts/productlist/productlist.component';
import { FeaturedSpotlightComponent } from '../Featured/featured-spotlight.component';

import { QuickStatsComponent } from '../../Shared/Stats/quick-stats.component';
import { ClickSparkComponent } from '../../Shared/Effects/click-spark/click-spark.component';
import { ProductDetailsPanelComponent } from '../../Panels/Product/product-details-panel.component';

import { DockComponent, DockItemData } from '../../Shared/Dock/dock.component';

import { UiSettingsService } from '../../Services/SettingService/ui-settings.service';

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
    ProductDetailsPanelComponent,
    DockComponent,
    FeaturedSpotlightComponent,
    QuickStatsComponent,

    ClickSparkComponent
  ]
})
export class HomeComponent implements OnDestroy {

  /* -----------------------------
     UI SETTINGS (Settings oldalról)
  ----------------------------- */

  setupMode = false;
  compactLayout = false;

  private uiSub?: Subscription;


  /* -----------------------------
     UI STATE
  ----------------------------- */

  selectedProduct: AnyProduct | null = null;
  featuredPool: AnyProduct[] = [];

  /* -----------------------------
     QUICK STATS
  ----------------------------- */

  totalAll = 0;
  allCategories: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private ui: UiSettingsService
  ) {
    // figyeljük a Settings állapotot
    this.uiSub = this.ui.state$.subscribe(s => {
      this.setupMode = !!s.setupMode;
      this.compactLayout = !!s.compactLayout;
    });
  }

  /* -----------------------------
     NAV HELPERS
  ----------------------------- */

  private scrollHomeTop() {
    if (this.router.url !== '/home' && this.router.url !== '/') {
      this.router.navigateByUrl('/home').then(() => {
        setTimeout(() =>
          window.scrollTo({ top: 0, behavior: 'smooth' }), 0
        );
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* -----------------------------
     PRODUCT DETAILS PANEL
  ----------------------------- */

  onOpenProduct(p: AnyProduct) {
    // auto-open product-site (ha később rákötöd a settingre, itt a helye)
    this.selectedProduct = p;
  }

  onClosePanel() {
    this.selectedProduct = null;
  }

  /* -----------------------------
     SPOTLIGHT POOL
  ----------------------------- */

  onProductsChanged(list: AnyProduct[]) {
    this.featuredPool = list || [];
  }

  /* -----------------------------
     STATS FROM PRODUCTLIST
  ----------------------------- */

  onStatsChanged(s: { totalAll: number; categoriesAll: string[] }) {
    this.totalAll = s.totalAll ?? 0;
    this.allCategories = Array.isArray(s.categoriesAll)
      ? s.categoriesAll
      : [];
  }

  ngOnDestroy(): void {
    this.uiSub?.unsubscribe();
  }
  mobileFiltersOpen = false;

  closeMobileFilters() {
    this.mobileFiltersOpen = false;
  }

}
