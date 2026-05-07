import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-setup-hierarchy-device-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup-hierarchy-device-picker.component.html',
  styleUrls: ['./setup-hierarchy-device-picker.component.css']
})
export class SetupHierarchyDevicePickerComponent {
  @Input() mode: 'none' | 'home_theater' = 'none';
  @Input() setupTitle = '';
  @Input() catalogLoading = false;
  @Input() selectedLoading = false;
  @Input() catalogError = '';
  @Input() selectedError = '';
  @Input() catalog: Record<string, any[]> = {};
  @Input() selectedDevices: any[] = [];
  @Input() categoryNameFn: (key: string) => string = (key) => key;
  @Input() productNameFn: (product: any) => string = (product) => product?.name ?? product?.model ?? 'Eszkoz';
  @Input() selectedRoleFn: (role: string) => string = (role) => role;
  @Input() renameSaving = false;

  @Output() addDevice = new EventEmitter<{ product: any; categoryKey: string }>();
  @Output() renameSetup = new EventEmitter<string>();

  search = '';
  activeCategory = 'all';
  draftSetupTitle = '';

  categoryKeys(): string[] {
    return Object.keys(this.catalog || {}).filter((key) => Array.isArray(this.catalog[key]) && this.catalog[key].length);
  }

  ngOnChanges(): void {
    this.draftSetupTitle = this.setupTitle || '';
  }

  visibleCategoryKeys(): string[] {
    const keys = this.categoryKeys();
    if (this.activeCategory === 'all') return keys;
    return keys.filter((key) => key === this.activeCategory);
  }

  filteredProducts(categoryKey: string): any[] {
    const source = Array.isArray(this.catalog?.[categoryKey]) ? this.catalog[categoryKey] : [];
    const q = String(this.search || '').trim().toLowerCase();
    if (!q) return source;

    return source.filter((product) => {
      const name = String(this.productNameFn(product) || '').toLowerCase();
      const manufacturer = String(product?.manufacturer || '').toLowerCase();
      return name.includes(q) || manufacturer.includes(q);
    });
  }

  selectCategory(categoryKey: string): void {
    this.activeCategory = categoryKey;
  }

  allVisibleCount(): number {
    return this.categoryKeys().reduce((sum, key) => sum + this.filteredProducts(key).length, 0);
  }

  submitRename(): void {
    const name = String(this.draftSetupTitle || '').trim();
    if (!name || name === String(this.setupTitle || '').trim()) return;
    this.renameSetup.emit(name);
  }
}
