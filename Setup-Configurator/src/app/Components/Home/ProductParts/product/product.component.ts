import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../Models/Product/product.model';
import { ImageService } from '../../../Services/image/image.service';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {

  @Input({ required: true }) product!: Product;

  imageUrl = 'https://via.placeholder.com/200?text=Loading';

  constructor(private images: ImageService) {}

  async ngOnInit() {
    await this.images.load();

    this.imageUrl = this.images.getImage(
      this.product.table,
      this.product
    );

    console.log(
      '🖼 PRODUCT IMAGE:',
      this.product.model,
      this.imageUrl
    );
  }

  open(): void {
    window.location.href =
      `/product.html?table=${this.product.table}&id=${this.product.id}`;
  }
}
