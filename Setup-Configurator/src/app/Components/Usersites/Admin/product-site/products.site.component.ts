import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ProductListComponent } from '../product-list/product.list.component';
import { ProductComponent } from '../product/product.component';
import { huTypeLabel } from '../product-type.labels';

export interface AdminProduct {
  id: number;
  manufacturer: string;
  model: string;
  price?: number;
  table_name: string;
  type?: string;
  type_label?: string;
  [key: string]: any;
}

type TypeTemplate = { type: string; properties: string[] };

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

  types: string[] = [];
  templates: Record<string, string[]> = {};

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadTypeMeta();
    this.loadProducts();
  }

  loadTypeMeta() {
    this.http.get<any>('/api/admin/products/types', { withCredentials: true }).subscribe({
      next: (res) => {
        const templatesArr: TypeTemplate[] = res?.templates || [];
        this.types = (res?.types || []).slice();
        this.templates = {};
        for (const t of templatesArr) this.templates[t.type] = (t.properties || []).slice();
      },
      error: () => {
        this.types = [];
        this.templates = {};
      }
    });
  }

  loadProducts() {
    this.http.get<any>(
      '/api/admin/products',
      {
        params: this.search ? { q: this.search } : {},
        withCredentials: true
      }
    ).subscribe(res => {
      this.products = (res.products || []).map((p: any) => ({
        ...p,
        type_label: huTypeLabel(p?.type),
      }));
      this.selected = null;
    });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.loadProducts();
  }

  onProductSelect(p: AdminProduct) {
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
    this.selected = {
      id: 0,
      table_name: 'products',
      name: '',
      type: '',
      category: '',
      data: {
        name: '',
        type: '',
        category: ''
      }
    } as any;
  }


  onSave(product: AdminProduct) {

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
        this.loadTypeMeta();
        this.loadProducts();
      },
      error: (err) => {
        console.error("SAVE ERR:", err);
        alert("Hiba a mentés során: " + (err.error?.error || err.message));
      }
    });
  }
}
