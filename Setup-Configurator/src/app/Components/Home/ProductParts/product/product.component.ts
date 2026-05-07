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
  @Input() priority = false;
  @Output() openProduct = new EventEmitter<Product>();

  imageUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22/%3E';
  private originalImageUrl = '';
  private imageFallbackUsed = false;
  private dragging = false;

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
    this.originalImageUrl = this.images.getOriginalImage(table, this.product);
    this.imageUrl = this.images.getImage(table, this.product, 260);


  }

  onImageError(): void {
    if (this.imageFallbackUsed || !this.originalImageUrl) return;

    this.imageFallbackUsed = true;
    this.imageUrl = this.originalImageUrl;
  }

  open(): void {
    if (this.dragging) {
      this.dragging = false;
      return;
    }

    this.openProduct.emit(this.product);
  }

  onDragStart(event: DragEvent): void {
    this.dragging = true;
    event.dataTransfer?.setData('application/json', JSON.stringify(this.product));
    event.dataTransfer?.setData('text/plain', JSON.stringify(this.product));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragEnd(): void {
    setTimeout(() => {
      this.dragging = false;
    });
  }
}
