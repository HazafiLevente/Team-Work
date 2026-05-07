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
import gsap from 'gsap';

type Dot = {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _busy: boolean;
};

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

const throttle = (fn: (...args: any[]) => void, limitMs: number) => {
  let last = 0;
  return (...args: any[]) => {
    const now = performance.now();
    if (now - last >= limitMs) {
      last = now;
      fn(...args);
    }
  };
};

@Component({
  selector: 'app-dot-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="dot-grid" [ngClass]="className" [ngStyle]="style">
      <div #wrap class="dot-grid__wrap">
        <canvas #canvas class="dot-grid__canvas"></canvas>
      </div>
    </section>
  `,
  styleUrls: ['./dot-grid.component.css']
})
export class DotGridComponent implements AfterViewInit, OnDestroy {


  @Input() dotSize = 5;
  @Input() gap = 15;

  @Input() baseColor = '#271E37';
  @Input() activeColor = '#5227FF';

  @Input() proximity = 100;
  @Input() speedTrigger = 100;

  @Input() shockRadius = 250;
  @Input() shockStrength = 5;

  @Input() maxSpeed = 5000;
  @Input() resistance = 750;
  @Input() returnDuration = 1.5;

  @Input() className = '';
  @Input() style: Record<string, any> | null = null;


  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;


  private dots: Dot[] = [];
  private rafId = 0;
  private ro: ResizeObserver | null = null;
  private destroyed = false;

  private circlePath: Path2D | null = null;
  private hasInertia = false;

  private pointer = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  };

  constructor(private zone: NgZone) {}


  async ngAfterViewInit() {
    if (typeof window === 'undefined') return;


    if ('Path2D' in window) {
      const p = new Path2D();
      p.arc(0, 0, this.dotSize / 2, 0, Math.PI * 2);
      this.circlePath = p;
    }

    await this.tryEnableInertia();

    this.buildGrid();
    this.bindResize();
    this.startDraw();
    this.bindPointer();
  }

  ngOnDestroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.ro?.disconnect();

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('mousemove', this._onMove);
      window.removeEventListener('click', this._onClick);
    }
  }


  private resizeHandler = () => {
    this.buildGrid();
  };

  private bindResize() {
    if (typeof window === 'undefined') return;

    const w = window as any;

    if (w.ResizeObserver) {
      const ro = new w.ResizeObserver(() => this.buildGrid());
      ro.observe(this.wrapRef.nativeElement);
      this.ro = ro;
    } else {
      window.addEventListener('resize', this.resizeHandler);
    }
  }


  private buildGrid() {
    const wrap = this.wrapRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    const cell = this.dotSize + this.gap;
    const cols = Math.floor((width + this.gap) / cell);
    const rows = Math.floor((height + this.gap) / cell);

    const gridW = cell * cols - this.gap;
    const gridH = cell * rows - this.gap;

    const startX = (width - gridW) / 2 + this.dotSize / 2;
    const startY = (height - gridH) / 2 + this.dotSize / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
          _busy: false
        });
      }
    }

    this.dots = dots;
  }


  private startDraw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.circlePath) return;

    const baseRgb = hexToRgb(this.baseColor);
    const activeRgb = hexToRgb(this.activeColor);
    const proxSq = this.proximity * this.proximity;

    const draw = () => {
      if (this.destroyed) return;

      const { width, height } = this.wrapRef.nativeElement.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      for (const dot of this.dots) {
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;

        const dx = dot.cx - this.pointer.x;
        const dy = dot.cy - this.pointer.y;
        const dsq = dx * dx + dy * dy;

        let fill = this.baseColor;
        if (dsq <= proxSq) {
          const t = 1 - Math.sqrt(dsq) / this.proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          fill = `rgb(${r},${g},${b})`;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = fill;
        if (!this.circlePath) return;
        ctx.fill(this.circlePath);
        ctx.restore();
      }

      this.rafId = requestAnimationFrame(draw);
    };

    this.rafId = requestAnimationFrame(draw);
  }


  private _onMove = (e: MouseEvent) => {};
  private _onClick = (e: MouseEvent) => {};

  private bindPointer() {
    this.zone.runOutsideAngular(() => {

      const onMove = (e: MouseEvent) => {
        const now = performance.now();
        const pr = this.pointer;
        const dt = pr.lastTime ? now - pr.lastTime : 16;

        const dx = e.clientX - pr.lastX;
        const dy = e.clientY - pr.lastY;

        let vx = (dx / dt) * 1000;
        let vy = (dy / dt) * 1000;
        let speed = Math.hypot(vx, vy);

        if (speed > this.maxSpeed) {
          const s = this.maxSpeed / speed;
          vx *= s;
          vy *= s;
          speed = this.maxSpeed;
        }

        pr.lastTime = now;
        pr.lastX = e.clientX;
        pr.lastY = e.clientY;
        pr.vx = vx;
        pr.vy = vy;
        pr.speed = speed;

        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        pr.x = e.clientX - rect.left;
        pr.y = e.clientY - rect.top;

        for (const dot of this.dots) {
          const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
          if (speed > this.speedTrigger && dist < this.proximity && !dot._busy) {
            dot._busy = true;
            this.kickDot(dot, dot.cx - pr.x + vx * 0.005, dot.cy - pr.y + vy * 0.005);
          }
        }
      };

      const onClick = (e: MouseEvent) => {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        for (const dot of this.dots) {
          const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
          if (dist < this.shockRadius && !dot._busy) {
            dot._busy = true;
            const falloff = Math.max(0, 1 - dist / this.shockRadius);
            this.kickDot(dot,
              (dot.cx - cx) * this.shockStrength * falloff,
              (dot.cy - cy) * this.shockStrength * falloff
            );
          }
        }
      };

      this._onMove = throttle(onMove, 50);
      this._onClick = onClick;

      window.addEventListener('mousemove', this._onMove, { passive: true });
      window.addEventListener('click', this._onClick);
    });
  }


  private async tryEnableInertia() {
    try {
      const mod: any = await import('gsap/InertiaPlugin');
      const InertiaPlugin = mod?.InertiaPlugin ?? mod?.default;
      if (InertiaPlugin) {
        gsap.registerPlugin(InertiaPlugin);
        this.hasInertia = true;
      }
    } catch {
      this.hasInertia = false;
    }
  }

  private kickDot(dot: Dot, pushX: number, pushY: number) {
    if (this.hasInertia) {
      gsap.to(dot, {
        inertia: { xOffset: pushX, yOffset: pushY, resistance: this.resistance } as any,
        onComplete: () => this.returnDot(dot)
      });
    } else {
      gsap.to(dot, {
        xOffset: pushX,
        yOffset: pushY,
        duration: 0.35,
        ease: 'power3.out',
        onComplete: () => this.returnDot(dot)
      });
    }
  }

  private returnDot(dot: Dot) {
    gsap.to(dot, {
      xOffset: 0,
      yOffset: 0,
      duration: this.returnDuration,
      ease: 'elastic.out(1,0.75)',
      onComplete: () => {
        dot._busy = false;
      }
    });
  }

}
