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

  constructor(private http: HttpClient) { }

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
    this.selected = { ...p };

    this.http.get<any>(
      `/api/admin/products/${p.table_name}/${p.id}`,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.selected = res.product;
        if (this.selected) this.selected['table_name'] = p.table_name;
      },
      error: (err) => console.error("DETAIL ERR:", err)
    });
  }

  onDelete(product: AdminProduct) {
    if (!confirm(`Biztosan törlöd: ${product.manufacturer} ${product.model}?`)) return;

    this.http.delete<any>(
      `/api/admin/products/${product.table_name}/${product.id}`,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        alert("Sikeres törlés!");
        this.selected = null;
        this.loadProducts();
      },
      error: (err) => alert("Hiba a törlésnél: " + (err.error?.error || err.message))
    });
  }

  onNewProduct() {
    const table = prompt("Melyik táblába szánod? (pl. routers, switches, motherboard)");
    if (!table) return;

    // Üres objektum alapértelmezett mezőkkel
    this.selected = {
      id: 0,
      table_name: table,
      manufacturer: '',
      model: '',
      price: 0
    } as any;
  }


  onSave(product: AdminProduct) {
    console.log('Mentés:', product);

    const isNew = !product.id || product.id === 0;
    const url = isNew
      ? `/api/admin/products/${product.table_name}`
      : `/api/admin/products/${product.table_name}/${product.id}`;

    const method = isNew ? 'post' : 'patch';

    this.http.request<any>(method, url, {
      body: product,
      withCredentials: true
    }).subscribe({
      next: (res) => {
        alert("Sikeres mentés!");
        if (isNew && res.id) product.id = res.id;
        this.loadProducts();
      },
      error: (err) => {
        console.error("SAVE ERR:", err);
        alert("Hiba a mentés során: " + (err.error?.error || err.message));
      }
    });
  }
}
