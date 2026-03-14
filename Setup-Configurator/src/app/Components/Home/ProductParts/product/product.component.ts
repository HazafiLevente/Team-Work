import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  @Output() openProduct = new EventEmitter<Product>();

  imageUrl = 'https://via.placeholder.com/200?text=Loading';

  constructor(private images: ImageService) {}

  get displayPrice(): number | null {
    return this.product.price ?? null;
  }

  async ngOnInit() {
    await this.images.load();

    const table = (this.product as any).table_name || this.product.table;
    this.imageUrl = this.images.getImage(table, this.product);

    console.log('🖼 CARD IMAGE', {
      table,
      id: (this.product as any).id,
      imageUrl: this.imageUrl,
      product: this.product
    });
  }

  open(): void {
    this.openProduct.emit(this.product);
  }
}
