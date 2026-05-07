import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { huTypeLabel } from '../product-type.labels';


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
  @Input() types: string[] = [];
  @Input() typeTemplates: Record<string, string[]> = {};

  @Output() saveProduct = new EventEmitter<any>();
  @Output() openProduct = new EventEmitter<any>();
  @Output() deleteProduct = new EventEmitter<any>();
  @Output() typeTemplatesChanged = new EventEmitter<void>();

  creatingType = false;
  newTypeName = '';
  newTypePropsInput = '';
  newTypeProps: string[] = [];

  constructor(private http: HttpClient) {}

  get obj(): any {
    return this.product?.data ?? this.product ?? {};
  }

  typeLabel(type: any): string {
    return huTypeLabel(type);
  }

  get activeType(): string {
    return String(this.obj?.type || '').trim();
  }

  typeKeys(): string[] {
    const t = this.activeType;
    const keys = (t && this.typeTemplates?.[t]) ? this.typeTemplates[t] : [];
    return (keys || []).filter(Boolean);
  }

  get isNew(): boolean {
    const id = this.obj?.id ?? this.product?.id;
    return !id || id === 0;
  }

  onTypeChange(value: string) {
    if (!this.product) return;
    const v = String(value || '').trim();
    if (v === '__new__') {
      this.creatingType = true;
      this.newTypeName = '';
      this.newTypeProps = [];
      this.newTypePropsInput = '';
      return;
    }

    this.creatingType = false;
    this.obj.type = v;
    const tpl = this.typeTemplates?.[v] || [];
    for (const key of tpl) {
      if (this.obj[key] === undefined) this.obj[key] = '';
    }
  }

  addNewTypeProp() {
    const v = String(this.newTypePropsInput || '').trim();
    if (!v) return;
    this.newTypeProps.push(v);
    this.newTypePropsInput = '';
  }

  removeNewTypeProp(idx: number) {
    this.newTypeProps.splice(idx, 1);
  }

  createTypeTemplate() {
    const type = String(this.newTypeName || '').trim();
    if (!type) return;
    const body = { type, properties: this.newTypeProps };

    this.http.post<any>('/api/admin/products/types', body, { withCredentials: true }).subscribe({
      next: () => {
        this.creatingType = false;
        this.obj.type = type;
        for (const key of this.newTypeProps) {
          if (this.obj[key] === undefined) this.obj[key] = '';
        }
        this.typeTemplatesChanged.emit();
      },
      error: () => {
        // keep UI as-is; user can retry
      }
    });
  }

  editableKeys(): string[] {
    const o = this.obj;
    const exclusions = ['id', 'table_name', 'table', 'source_table', 'product_table', 'data', 'created_at', 'image', 'image_url'];
    const baseExcluded = new Set(exclusions.map(x => x.toLowerCase()));
    const hardExcluded = new Set(['type', 'category', 'manufacturer', 'model', 'price'].map(x => x.toLowerCase()));

    const allowed = this.typeKeys().map(k => String(k)).filter(Boolean);
    if (allowed.length) {
      // Only show keys that belong to this type template.
      return allowed.filter(k => {
        const lk = k.toLowerCase();
        return !baseExcluded.has(lk) && !hardExcluded.has(lk);
      });
    }

    // Fallback: if no template found, keep old behavior (but still hide the common fields)
    return Object.keys(o).filter(k => {
      const lk = k.toLowerCase();
      return !baseExcluded.has(lk) && !hardExcluded.has(lk);
    });
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
