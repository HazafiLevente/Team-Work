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

  get displayName(): string {
    const p: any = this.product;
    return String(
      p?.name ??
      p?.data?.name ??
      p?.model ??
      p?.data?.model ??
      p?.data?.Model ??
      ''
    ).trim();
  }

  get displayPrice(): number | null {
    const p: any = this.product;
    if (!p) return null;

    const raw =
      p.price ??
      p.Price ??
      p.price_range ??
      p['Price Range (Ft)'] ??
      p?.data?.price ??
      p?.data?.Price ??
      p?.data?.price_range ??
      p?.data?.['Price Range (Ft)'] ??
      null;

    return this.parsePrice(raw);
  }

  private parsePrice(raw: any): number | null {
    if (raw == null || raw === '') return null;

    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? raw : null;
    }

    const text = String(raw).trim();
    if (!text) return null;

    const nums = (text.match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(n => Number.isFinite(n));

    if (!nums.length) return null;
    if (nums.length === 1) return Math.round(nums[0]);

    return Math.round((Math.min(...nums) + Math.max(...nums)) / 2);
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

    console.log('💰 CARD PRICE RAW', {
      product: this.product,
      displayPrice: this.displayPrice
    });
  }

  open(): void {
    this.openProduct.emit(this.product);
  }
}
