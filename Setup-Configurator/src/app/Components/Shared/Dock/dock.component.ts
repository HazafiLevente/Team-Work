import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  QueryList,
  Renderer2,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type DockItemData = {
  icon: string;     // pl: '🏠' vagy '⚙️' vagy egy SVG string (egyszerűen)
  label: string;
  onClick: () => void;
  className?: string;
};

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.css']
})
export class DockComponent implements AfterViewInit {

  @Input() items: DockItemData[] = [];

  @Input() distance = 200;
  @Input() panelHeight = 68;
  @Input() baseItemSize = 50;
  @Input() magnification = 80;

  @ViewChildren('dockItemEl') dockItemEls!: QueryList<ElementRef<HTMLElement>>;

  private mouseX = Number.POSITIVE_INFINITY;
  private rects: DOMRect[] = [];
  private raf = 0;
  isHovering = false;

  constructor(private r: Renderer2) {}

  ngAfterViewInit(): void {
    this.measure();
    // első render
    this.applySizes();
    // resize esetén újramérés
    setTimeout(() => this.measure(), 0);
  }

  @HostListener('window:resize')
  onResize() {
    this.measure();
    this.applySizes();
  }

  measure() {
    const els = this.dockItemEls?.toArray()?.map(x => x.nativeElement) ?? [];
    this.rects = els.map(el => el.getBoundingClientRect());
  }

  onMouseMove(ev: MouseEvent) {
    this.isHovering = true;
    this.mouseX = ev.clientX;

    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      this.measure();
      this.applySizes();
    });
  }

  onMouseLeave() {
    this.isHovering = false;
    this.mouseX = Number.POSITIVE_INFINITY;
    this.applySizes(); // vissza base méretre
  }

  private mapRange(x: number, inMin: number, inMax: number, outMin: number, outMax: number) {
    const t = (x - inMin) / (inMax - inMin);
    const tt = Math.max(0, Math.min(1, t));
    return outMin + (outMax - outMin) * tt;
  }

  private applySizes() {
    const els = this.dockItemEls?.toArray()?.map(x => x.nativeElement) ?? [];
    if (!els.length) return;

    els.forEach((el, i) => {
      const rect = this.rects[i] ?? el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;

      const dx = this.mouseX - center;
      const adx = Math.abs(dx);

      let size = this.baseItemSize;

      if (this.isHovering && Number.isFinite(this.mouseX)) {
        // 0 távolság: magnification, distance-en túl: base
        const t = this.mapRange(adx, 0, this.distance, 0, 1);
        size = this.magnification + (this.baseItemSize - this.magnification) * t;
      }

      this.r.setStyle(el, 'width', `${size}px`);
      this.r.setStyle(el, 'height', `${size}px`);
    });
  }

  clickItem(i: number) {
    const it = this.items[i];
    it?.onClick?.();
  }
}
