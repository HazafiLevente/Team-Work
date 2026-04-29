import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';
import { CardSwapComponent } from '../../Shared/CardSwap/card-swap.component';

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [CommonModule, CardSwapComponent],
  templateUrl: './product-gallery.component.html',
  styleUrls: ['./product-gallery.component.css']
})
export class ProductGalleryComponent {
  @Input() images: string[] = [];
  @Input() title = 'Product image';

  active = 0;

  viewerOpen = false;
  direction: 'next' | 'prev' = 'next';

  get hasImages(): boolean {
    return Array.isArray(this.images) && this.images.length > 0;
  }

  get currentSrc(): string {
    return this.hasImages ? this.images[this.active] : 'assets/img/placeholder.png';
  }

  openViewer(index = this.active) {
    if (!this.hasImages) return;
    this.active = Math.max(0, Math.min(index, this.images.length - 1));
    this.viewerOpen = true;
  }

  closeViewer() {
    this.viewerOpen = false;
  }

  prev() {
    if (!this.hasImages) return;
    this.direction = 'prev';
    this.active = (this.active - 1 + this.images.length) % this.images.length;
  }

  next() {
    if (!this.hasImages) return;
    this.direction = 'next';
    this.active = (this.active + 1) % this.images.length;
  }


  setActive(i: number) {
    if (!this.hasImages) return;
    this.direction = i > this.active ? 'next' : 'prev';
    this.active = i;
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.viewerOpen) return;

    if (e.key === 'Escape') this.closeViewer();
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'ArrowRight') this.next();
  }
}
