import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';



type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
};

@Component({
  selector: 'app-click-spark',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #wrap class="click-spark" (click)="onClick($event)">
      <canvas #canvas class="click-spark__canvas"></canvas>
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./click-spark.component.css']
})
export class ClickSparkComponent implements AfterViewInit, OnDestroy {


  @Input() sparkColor = '#fff';
  @Input() sparkSize = 10;
  @Input() sparkRadius = 15;
  @Input() sparkCount = 8;
  @Input() duration = 400;
  @Input() easing: Easing = 'ease-out';
  @Input() extraScale = 1.0;


  @Input() enabled = true;

  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;


  private ro: { observe: (el: Element) => void; disconnect: () => void } | null = null;
  private usedWindowResizeFallback = false;

  private sparks: Spark[] = [];
  private destroyed = false;


  private resizeHandler = () => this.resizeCanvas();

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    this.ctx = this.canvasRef.nativeElement.getContext('2d');

    this.zone.runOutsideAngular(() => {
      this.resizeCanvas();
      this.bindResizeObserver();
      this.startLoop();
    });

  }


  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);

    this.ro?.disconnect();
    this.ro = null;

    if (this.usedWindowResizeFallback && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  onClick(e: MouseEvent): void {

    if (!this.enabled) return;
    if (typeof window === 'undefined') return;
    console.log('CLICK SPARK fired');

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const now = performance.now();

    for (let i = 0; i < this.sparkCount; i++) {
      this.sparks.push({
        x,
        y,
        angle: (2 * Math.PI * i) / this.sparkCount,
        startTime: now
      });
    }

  }


  private bindResizeObserver(): void {
    if (typeof window === 'undefined') return;

    const parent = this.wrapRef.nativeElement;

    const RO = (window as any).ResizeObserver as
      | (new (cb: any) => { observe: (el: Element) => void; disconnect: () => void })
      | undefined;

    if (RO) {
      this.ro = new RO(() => this.resizeCanvas());
      this.ro.observe(parent as unknown as Element);
      this.usedWindowResizeFallback = false;
    } else {
      window.addEventListener('resize', this.resizeHandler);
      this.usedWindowResizeFallback = true;
    }
  }

  private resizeCanvas(): void {
    if (typeof window === 'undefined') return;

    const canvas = this.canvasRef?.nativeElement;
    const wrap = this.wrapRef?.nativeElement;
    if (!canvas || !wrap) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = this.ctx;
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  private startLoop(): void {
    if (typeof window === 'undefined') return;

    const loop = (ts: number) => {
      if (this.destroyed) return;

      const ctx = this.ctx;
      if (!ctx) {
        this.rafId = requestAnimationFrame(loop);
        return;
      }

      const { width, height } = this.wrapRef.nativeElement.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const dur = Math.max(16, this.duration);

      const alive: Spark[] = [];
      for (const s of this.sparks) {
        const elapsed = ts - s.startTime;
        if (elapsed >= dur) continue;

        const progress = elapsed / dur;
        const eased = this.ease(progress);

        const distance = eased * this.sparkRadius * this.extraScale;
        const lineLength = this.sparkSize * (1 - eased);

        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);

        const x1 = s.x + distance * cos;
        const y1 = s.y + distance * sin;
        const x2 = s.x + (distance + lineLength) * cos;
        const y2 = s.y + (distance + lineLength) * sin;

        ctx.strokeStyle = this.sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        alive.push(s);
      }

      this.sparks = alive;
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private ease(t: number): number {
    const x = Math.max(0, Math.min(1, t));
    switch (this.easing) {
      case 'linear':
        return x;
      case 'ease-in':
        return x * x;
      case 'ease-in-out':
        return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;
      default:
        return x * (2 - x);
    }

  }

}
