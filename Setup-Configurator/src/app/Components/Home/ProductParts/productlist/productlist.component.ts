import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductService } from '../../../Services/Home/ProductParts/product/product.service';
import { Product } from '../../../../Models/Product/product.model';
import { ProductComponent } from '../product/product.component';

@Component({
  selector: 'app-productlist',
  standalone: true,
  imports: [CommonModule, ProductComponent],
  templateUrl: './productlist.component.html',
  styleUrls: ['./productlist.component.css']
})
export class ProductlistComponent implements OnInit {

  products: Product[] = [];
  loading = true;

  /** 🔥 CSAK ITT ADJUK MEG MENNYIT AKARUNK */
  readonly PRODUCT_LIMIT = 20;

  constructor(private productService: ProductService) {}


  ngOnInit(): void {
    console.log('ProductList init');

    this.productService.getProducts(this.PRODUCT_LIMIT).subscribe({
      next: res => {
        console.log('API RESPONSE', res);
        this.products = res.items;
        this.loading = false;
      },
      error: err => {
        console.error('API ERROR', err);
        this.loading = false;
      }
    });
  }

}
