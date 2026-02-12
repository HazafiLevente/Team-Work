import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ProductListComponent } from '../product-list/product.list.component';
import { ProductComponent } from '../product/product.component';

export interface AdminProduct {
  id: number;
  manufacturer: string;
  model: string;
  price?: number;
  table_name: string;
  [key: string]: any;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, ProductListComponent, ProductComponent],
  templateUrl: './products.site.component.html',
  styleUrls: ['./products.site.component.css']
})
export class ProductsSiteComponent implements OnInit {

  search = '';
  products: AdminProduct[] = [];
  selected: AdminProduct | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.http.get<any>(
      '/api/admin/products',
      {
        params: this.search ? { q: this.search } : {},
        withCredentials: true
      }
    ).subscribe(res => {
      this.products = res.products || [];
      this.selected = null;
    });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.loadProducts();
  }

  onProductSelect(p: AdminProduct) {
    console.log("KATT LISTA:", p);

    // UI-n azonnal látszódjon, hogy kiválasztottad
    this.selected = { ...p };

    this.http.get<any>(
      `/api/admin/products/${p.table_name}/${p.id}`,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        console.log("DETAIL RES:", res);
        this.selected = res.product; // itt jönnek a tulajdonságok
      },
      error: (err) => {
        console.error("DETAIL ERR:", err);
      }
    });
  }


  onSave(product: AdminProduct) {
    console.log('PATCH ide jön:', product);
  }
}
