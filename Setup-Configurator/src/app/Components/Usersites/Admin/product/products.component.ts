import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface AdminProduct {
  id: number;
  manufacturer: string;
  model: string;
  price?: number;
  table_name: string;   // ⬅️ KELL
  [key: string]: any;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

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

  selectProduct(p: AdminProduct) {
    this.http.get<any>(
      `/api/admin/products/${p.table_name}/${p.id}`,
      { withCredentials: true }
    ).subscribe(res => {
      this.selected = res.product;
    });
  }

  saveProduct() {
    if (!this.selected) return;
    console.log('MENTÉS (PATCH ide jön):', this.selected);
  }
}
