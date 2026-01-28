import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../Models/Product/product.model';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent {

  @Input({ required: true })
  product!: Product;

  open(): void {
    window.location.href =
      `/product.html?table=${this.product.table}&id=${this.product.id}`;
  }
}
