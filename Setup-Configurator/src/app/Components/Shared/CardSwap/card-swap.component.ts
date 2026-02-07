import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

type Slot = { x: number; y: number; zIndex: number };

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
  x: i * distX,
  y: -i * distY,
  zIndex: total - i
});

@Component({
  selector: 'app-card-swap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #container class="card-swap-container" [style.width]="widthCss" [style.height]="heightCss">
      <button
        class="card"
        #cardEl
        type="button"
        *ngFor="let img of images; let i = index"
        (click)="onCardClick(i)"
        [attr.aria-label]="'Image ' + (i + 1)">
        <img [src]="img" alt="" draggable="false" />
      </button>
    </div>
  `,
  styleUrls: ['./card-swap.component.css']
})
export class CardSwapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() images: string[] = [];

  @Input() width: number | string = '100%';
  @Input() height: number | string = 240;

  @Input() cardDistance = 55;
  @Input() verticalDistance = 18;
  @Input() delay = 4500;
  @Input() pauseOnHover = true;

  @Input() easing: 'linear' | 'elastic' = 'elastic';
  @Input() skewAmount = 0;

  // külső active index (ha kell)
  @Input() activeIndex = 0;

  @Output() cardClick = new EventEmitter<number>();

  // ✅ ÚJ: jelezzük kifelé, hogy épp melyik card van elöl
  @Output() activeIndexChanged = new EventEmitter<number>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;

  private order: number[] = [];
  private tl: gsap.core.Timeline | null = null;
  private intervalId: any = null;
  private paused = false;

  private els: HTMLElement[] = [];
  private total = 0;

  private config = {
    ease: 'elastic.out(0.6,0.9)',
    durDrop: 1.4,
    durMove: 1.4,
    durReturn: 1.4,
    promoteOverlap: 0.85,
    returnDelay: 0.05
  };

  get widthCss(): string {
    return typeof this.width === 'number' ? `${this.width}px` : this.width;
  }

  get heightCss(): string {
    return typeof this.height === 'number' ? `${this.height}px` : this.height;
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.rebuild());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['images'] && !changes['images'].firstChange) {
      queueMicrotask(() => this.rebuild());
      return;
    }

    if (changes['activeIndex'] && !changes['activeIndex'].firstChange) {
      queueMicrotask(() => this.bringToFront(this.activeIndex));
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  onCardClick(i: number) {
    this.cardClick.emit(i);
    this.bringToFront(i);
  }

  // -----------------------------
  // Core lifecycle
  // -----------------------------

  private rebuild() {
    this.cleanup();

    this.els = this.cardEls?.toArray().map(r => r.nativeElement) ?? [];
    this.total = this.els.length;
    if (this.total === 0) return;

    this.config =
      this.easing === 'elastic'
        ? {
          ease: 'elastic.out(0.6,0.9)',
          durDrop: 1.4,
          durMove: 1.4,
          durReturn: 1.4,
          promoteOverlap: 0.85,
          returnDelay: 0.05
        }
        : {
          ease: 'power1.inOut',
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2
        };

    this.order = this.makeOrderWithFront(this.clampIndex(this.activeIndex, this.total), this.total);

    this.els.forEach(el => gsap.set(el, { clearProps: 'transform' }));

    this.layout(this.els, this.order);

    // ✅ induláskor is jelezzük, mi van elöl
    this.emitFront();

    // ✅ induláskor egy swap
    this.swapOnce();

    this.startInterval();
    this.bindHover();
  }

  private startInterval() {
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = window.setInterval(() => {
      if (!this.paused) this.swapOnce();
    }, this.delay);
  }

  private bindHover() {
    if (!this.pauseOnHover) return;
    const node = this.containerRef.nativeElement;
    node.addEventListener('mouseenter', this.onEnter);
    node.addEventListener('mouseleave', this.onLeave);
  }

  // -----------------------------
  // Animation
  // -----------------------------

  private swapOnce() {
    if (this.order.length < 2 || this.total < 2) return;

    const [front, ...rest] = this.order;
    const elFront = this.els[front];

    const drop = this.containerRef.nativeElement.clientHeight + 80;

    const tl = gsap.timeline();
    this.tl = tl;

    tl.to(elFront, {
      y: `+=${drop}`,
      duration: this.config.durDrop,
      ease: this.config.ease
    });

    tl.addLabel('promote', `-=${this.config.durDrop * this.config.promoteOverlap}`);

    rest.forEach((idx, i) => {
      const el = this.els[idx];
      const slot = makeSlot(i, this.cardDistance, this.verticalDistance, this.total);

      tl.set(el, { zIndex: slot.zIndex }, 'promote');
      tl.to(
        el,
        { x: slot.x, y: slot.y, duration: this.config.durMove, ease: this.config.ease },
        `promote+=${i * 0.10}`
      );
    });

    const backSlot = makeSlot(this.total - 1, this.cardDistance, this.verticalDistance, this.total);
    tl.addLabel('return', `promote+=${this.config.durMove * this.config.returnDelay}`);

    tl.call(() => {
      gsap.set(elFront, { zIndex: backSlot.zIndex });
    }, undefined, 'return');

    tl.to(
      elFront,
      { x: backSlot.x, y: backSlot.y, duration: this.config.durReturn, ease: this.config.ease },
      'return'
    );

    // ✅ amikor kész a swap, frissítsük az ordert és emitteljük az új frontot
    tl.call(() => {
      this.order = [...rest, front];
      this.emitFront();
    });
  }

  // -----------------------------
  // External control
  // -----------------------------

  private bringToFront(idx: number) {
    if (!this.els?.length || this.total === 0) return;

    const front = this.clampIndex(idx, this.total);
    this.order = this.makeOrderWithFront(front, this.total);

    this.tl?.kill();
    this.tl = null;

    this.layout(this.els, this.order);

    // ✅ kattintásra is jelezzük
    this.emitFront();

    this.startInterval();
  }

  private layout(els: HTMLElement[], order: number[]) {
    const total = els.length;

    order.forEach((idx, pos) => {
      const el = els[idx];
      const slot = makeSlot(pos, this.cardDistance, this.verticalDistance, total);

      gsap.set(el, {
        x: slot.x,
        y: slot.y,
        xPercent: -50,
        yPercent: -50,
        skewY: this.skewAmount,
        rotation: 0,
        transformOrigin: 'center center',
        zIndex: slot.zIndex
      });
    });
  }

  private emitFront() {
    const front = this.order?.[0];
    if (front == null) return;
    this.activeIndexChanged.emit(front);
  }

  private makeOrderWithFront(front: number, total: number): number[] {
    const arr = Array.from({ length: total }, (_, i) => i);
    return [front, ...arr.filter(x => x !== front)];
  }

  private clampIndex(i: number, total: number): number {
    const n = Number(i);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(Math.floor(n), total - 1));
  }

  private cleanup() {
    try { this.tl?.kill(); } catch {}
    this.tl = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.pauseOnHover && this.containerRef?.nativeElement) {
      const node = this.containerRef.nativeElement;
      node.removeEventListener('mouseenter', this.onEnter);
      node.removeEventListener('mouseleave', this.onLeave);
    }
  }

  private onEnter = () => {
    this.paused = true;
    this.tl?.pause();
  };

  private onLeave = () => {
    this.paused = false;
    this.tl?.play();
  };
}
