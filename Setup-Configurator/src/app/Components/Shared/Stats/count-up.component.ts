import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-count-up',
  standalone: true,
  imports: [CommonModule],
  template: `<span #el class="count">{{ display }}</span>`,
  styleUrls: ['./count-up.component.css']
})
export class CountUpComponent implements OnChanges, OnDestroy {
  @Input() from = 0;
  @Input() to = 0;
  @Input() durationMs = 900;
  @Input() separator = ' ';

  @ViewChild('el', { static: true }) elRef!: ElementRef<HTMLSpanElement>;

  display = '0';
  private raf = 0;
  private startTs = 0;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['to'] || ch['from'] || ch['durationMs']) {
      this.start();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }

  private start() {
    cancelAnimationFrame(this.raf);

    const from = Number(this.from) || 0;
    const to = Number(this.to) || 0;
    const dur = Math.max(150, Number(this.durationMs) || 900);

    this.startTs = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - this.startTs) / dur);


      const eased = 1 - Math.pow(1 - t, 3);

      const v = from + (to - from) * eased;
      const iv = Math.round(v);

      this.display = this.format(iv);
      if (t < 1) this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  private format(n: number): string {

    const s = Math.abs(n).toString();
    const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, this.separator);
    return n < 0 ? `-${out}` : out;
  }
}
