import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminProduct } from '../product-site/products.site.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product.list.component.html',
  styleUrls: ['./product.list.component.css']
})
export class ProductListComponent {

  @Input() products: AdminProduct[] = [];
  @Input() search = '';
  @Input() selected: AdminProduct | null = null;

  @Output() searchChange = new EventEmitter<string>();
  @Output() productSelect = new EventEmitter<AdminProduct>();
  @Output() newProduct = new EventEmitter<void>();

  onNew() {
    this.newProduct.emit();
  }
}
