import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

type AnyProduct = any;

@Component({
  selector: 'app-product-site-staggered-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-staggered-panel.component.html',
  styleUrls: ['./product-staggered-panel.component.css']
})
export class ProductStaggeredPanelComponent implements AfterViewInit, OnChanges, OnDestroy {


  @Input() open = false;


  @Input() product: AnyProduct | null = null;


  @Output() closed = new EventEmitter<void>();


  @Input() closeOnOverlayClick = true;


  @Input() position: 'right' | 'left' = 'right';


  @Input() overlayOpacity = 0.55;

  @Input() colors: string[] = ['#B19EEF', '#5227FF'];

  @ViewChild('overlay', { static: true }) overlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('panel', { static: true }) panelRef!: ElementRef<HTMLDivElement>;
  @ViewChild('content', { static: true }) contentRef!: ElementRef<HTMLDivElement>;

  private tlOpen?: gsap.core.Timeline;
  private tlClose?: gsap.core.Timeline;
  private inited = false;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.initStyles();
      this.inited = true;


      if (this.open) this.playOpen();
    });
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (!this.inited) return;

    if (ch['open']) {
      const v = !!ch['open'].currentValue;
      if (v) this.playOpen();
      else this.playClose();
    }
  }

  ngOnDestroy(): void {
    this.tlOpen?.kill();
    this.tlClose?.kill();
  }




  onOverlayClick(): void {
    if (!this.closeOnOverlayClick) return;
    this.requestClose();
  }

  requestClose(): void {

    this.closed.emit();
  }




  private initStyles(): void {
    const overlay = this.overlayRef?.nativeElement;
    const panel = this.panelRef?.nativeElement;
    const content = this.contentRef?.nativeElement;
    if (!overlay || !panel || !content) return;

    const offX = this.position === 'left' ? -110 : 110;

    gsap.set(overlay, { opacity: 0, pointerEvents: 'none' });
    gsap.set(panel, { xPercent: offX });
    gsap.set(content, { opacity: 0, y: 10 });
  }

  private playOpen(): void {
    const overlay = this.overlayRef?.nativeElement;
    const panel = this.panelRef?.nativeElement;
    const content = this.contentRef?.nativeElement;
    if (!overlay || !panel || !content) return;

    this.tlClose?.kill();
    this.tlOpen?.kill();

    const offX = this.position === 'left' ? -110 : 110;


    gsap.set(panel, { xPercent: offX });
    gsap.set(content, { opacity: 0, y: 10 });

    this.tlOpen = gsap.timeline();

    this.tlOpen.set(overlay, { pointerEvents: 'auto' });

    this.tlOpen.to(overlay, {
      opacity: this.overlayOpacity,
      duration: 0.18,
      ease: 'power2.out'
    }, 0);

    this.tlOpen.to(panel, {
      xPercent: 0,
      duration: 0.55,
      ease: 'power4.out'
    }, 0);


    this.tlOpen.to(content, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power3.out'
    }, 0.18);
  }

  private playClose(): void {
    const overlay = this.overlayRef?.nativeElement;
    const panel = this.panelRef?.nativeElement;
    const content = this.contentRef?.nativeElement;
    if (!overlay || !panel || !content) return;

    this.tlOpen?.kill();
    this.tlClose?.kill();

    const offX = this.position === 'left' ? -110 : 110;

    this.tlClose = gsap.timeline({
      onComplete: () => {


        gsap.set(overlay, { pointerEvents: 'none' });
      }
    });

    this.tlClose.to(content, {
      opacity: 0,
      y: 10,
      duration: 0.18,
      ease: 'power2.in'
    }, 0);

    this.tlClose.to(panel, {
      xPercent: offX,
      duration: 0.38,
      ease: 'power3.in'
    }, 0);

    this.tlClose.to(overlay, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in'
    }, 0.04);
  }




  formatPrice(v: any): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'N/A';
    return new Intl.NumberFormat('hu-HU').format(n) + ' Ft';
  }

  get tableName(): string {
    const p = this.product as any;
    return p?.table_name ?? p?.table ?? '—';
  }
}
