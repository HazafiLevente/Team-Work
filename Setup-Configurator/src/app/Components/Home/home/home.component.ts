import { Component, OnDestroy, HostListener, OnInit } from '@angular/core';
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
export class HomeComponent implements OnInit, OnDestroy {
  
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768 && this.mobileFiltersOpen) {
      this.mobileFiltersOpen = false;
    }
  }

  setupMode = false;
  compactLayout = false;

  private uiSub?: Subscription;

  selectedProduct: AnyProduct | null = null;
  featuredPool: AnyProduct[] = [];

  totalAll = 0;
  allCategories: string[] = [];

  mobileFiltersOpen = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ui: UiSettingsService
  ) {
    this.uiSub = this.ui.state$.subscribe(s => {
      this.setupMode = !!s.setupMode;
      this.compactLayout = !!s.compactLayout;
    });
  }

  ngOnInit(): void {
    document.body.setAttribute('data-page', 'home');
  }

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

  onOpenProduct(p: AnyProduct) {
    this.selectedProduct = p;
  }

  onClosePanel() {
    this.selectedProduct = null;
  }

  onProductsChanged(list: AnyProduct[]) {
    this.featuredPool = list || [];
  }

  onStatsChanged(s: { totalAll: number; categoriesAll: string[] }) {
    this.totalAll = s.totalAll ?? 0;
    this.allCategories = Array.isArray(s.categoriesAll)
      ? s.categoriesAll
      : [];
  }

  closeMobileFilters() {
    this.mobileFiltersOpen = false;
  }

  ngOnDestroy(): void {
    this.uiSub?.unsubscribe();
  }
}
