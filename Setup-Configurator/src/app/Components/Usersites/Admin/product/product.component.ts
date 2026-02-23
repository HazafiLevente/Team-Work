import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Ugyanaz a komponens megy Home + Admin oldalon.
 * adminMode kapcsolja a szerkeszthető módot.
 */
@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent {

  @Input() product: any;
  @Input() adminMode = false;

  @Output() saveProduct = new EventEmitter<any>();
  @Output() openProduct = new EventEmitter<any>();
  @Output() deleteProduct = new EventEmitter<any>();

  /**
   * Ha view-ból jön (data mezőben vannak a specifikációk),
   * akkor azt használjuk, különben sima objektum.
   */
  get obj(): any {
    return this.product?.data ?? this.product ?? {};
  }

  /** Dinamikusan szerkeszthető mezők */
  editableKeys(): string[] {
    const o = this.obj;
    const exclusions = ['id', 'table_name', 'data', 'type', 'category', 'created_at', 'image', 'image_url'];
    return Object.keys(o).filter(k =>
      !exclusions.some(ex => ex.toLowerCase() === k.toLowerCase())
    );
  }

  formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getInputType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'string' && value.length > 150) return 'textarea';
    return 'text';
  }

  onSave() {
    this.saveProduct.emit(this.product);
  }

  onDelete() {
    this.deleteProduct.emit(this.product);
  }

  onOpen() {
    this.openProduct.emit(this.product);
  }
}
