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

  async ngOnInit() {
    await this.images.load();
    this.imageUrl = this.images.getImage(this.product.table ?? (this.product as any).table_name, this.product);
  }

  open(): void {
    console.log('✅ ProductComponent click:', this.product);
    this.openProduct.emit(this.product);
  }
}
