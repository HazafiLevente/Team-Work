import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-electric-border',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #container class="electric-border" [ngStyle]="styleVars">
      <div class="eb-canvas-container">
        <canvas #canvas class="eb-canvas"></canvas>
      </div>
      <div class="eb-layers">
        <div class="eb-glow-1"></div>
        <div class="eb-glow-2"></div>
        <div class="eb-background-glow"></div>
      </div>
      <div class="eb-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./electric-border.component.css']
})
export class ElectricBorderComponent implements AfterViewInit, OnDestroy {
  @Input() color = '#7df9ff';
  @Input() speed = 1;
  @Input() chaos = 0.12;
  @Input() borderRadius = 16;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  private raf: number | null = null;
  private resizeRaf: number | null = null;   // ✅ FIX
  private time = 0;
  private last = 0;
  private ro?: ResizeObserver;

  get styleVars() {
    return {
      '--electric-border-color': this.color,
      borderRadius: `${this.borderRadius}px`
    } as any;
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const octaves = 10, lacunarity = 1.6, gain = 0.7, amplitude = this.chaos, frequency = 10;
    const baseFlatness = 0, displacement = 60, borderOffset = 60;

    const random = (x: number) => (Math.sin(x * 12.9898) * 43758.5453) % 1;

    const noise2D = (x: number, y: number) => {
      const i = Math.floor(x), j = Math.floor(y);
      const fx = x - i, fy = y - j;
      const a = random(i + j * 57);
      const b = random(i + 1 + j * 57);
      const c = random(i + (j + 1) * 57);
      const d = random(i + 1 + (j + 1) * 57);
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
    };

    const octavedNoise = (x: number, seed: number, t: number) => {
      let y = 0, amp = amplitude, freq = frequency;
      for (let i = 0; i < octaves; i++) {
        let oa = amp;
        if (i === 0) oa *= baseFlatness;
        y += oa * noise2D(freq * x + seed * 100, t * freq * 0.3);
        freq *= lacunarity;
        amp *= gain;
      }
      return y;
    };

    const cornerPoint = (cx: number, cy: number, r: number, start: number, arc: number, p: number) => {
      const ang = start + p * arc;
      return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
    };

    const roundedRectPoint = (t: number, left: number, top: number, w: number, h: number, r: number) => {
      const sw = w - 2 * r, sh = h - 2 * r;
      const ca = (Math.PI * r) / 2;
      const per = 2 * sw + 2 * sh + 4 * ca;
      const dist = t * per;
      let acc = 0;

      if (dist <= acc + sw) return { x: left + r + ((dist - acc) / sw) * sw, y: top };
      acc += sw;

      if (dist <= acc + ca) return cornerPoint(left + w - r, top + r, r, -Math.PI/2, Math.PI/2, (dist-acc)/ca);
      acc += ca;

      if (dist <= acc + sh) return { x: left + w, y: top + r + ((dist - acc) / sh) * sh };
      acc += sh;

      if (dist <= acc + ca) return cornerPoint(left + w - r, top + h - r, r, 0, Math.PI/2, (dist-acc)/ca);
      acc += ca;

      if (dist <= acc + sw) return { x: left + w - r - ((dist - acc) / sw) * sw, y: top + h };
      acc += sw;

      if (dist <= acc + ca) return cornerPoint(left + r, top + h - r, r, Math.PI/2, Math.PI/2, (dist-acc)/ca);
      acc += ca;

      if (dist <= acc + sh) return { x: left, y: top + h - r - ((dist - acc) / sh) * sh };
      acc += sh;

      return cornerPoint(left + r, top + r, r, Math.PI, Math.PI/2, (dist-acc)/ca);
    };

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width + borderOffset * 2;
      const height = rect.height + borderOffset * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // ✅ reset transform for safety
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      return { width, height, dpr };
    };

    let size = updateSize();

    const draw = (now: number) => {
      const delta = (now - this.last) / 1000;
      this.last = now;
      this.time += delta * this.speed;

      const { width, height, dpr } = size;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const left = borderOffset, top = borderOffset;
      const bw = width - 2 * borderOffset;
      const bh = height - 2 * borderOffset;
      const maxR = Math.min(bw, bh) / 2;
      const r = Math.min(this.borderRadius, maxR);

      const approxPer = 2 * (bw + bh) + 2 * Math.PI * r;
      const sampleCount = Math.floor(approxPer / 2);

      ctx.beginPath();

      for (let i = 0; i <= sampleCount; i++) {
        const p = i / sampleCount;
        const pt = roundedRectPoint(p, left, top, bw, bh, r);

        const xN = octavedNoise(p * 8, 0, this.time);
        const yN = octavedNoise(p * 8, 1, this.time);

        const x = pt.x + xN * displacement;
        const y = pt.y + yN * displacement;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.stroke();

      this.raf = requestAnimationFrame(draw);
    };

    this.ro = new ResizeObserver(() => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        size = updateSize();
        this.resizeRaf = null;
      });
    });

    this.ro.observe(container);
    this.raf = requestAnimationFrame(draw);
  }

  ngOnDestroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
    this.ro?.disconnect();
  }
}
