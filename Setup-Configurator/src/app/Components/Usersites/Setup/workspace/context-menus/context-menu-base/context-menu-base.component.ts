import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  HostListener,
  ViewChild,
  AfterViewInit,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-context-menu-base',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context-menu-base.component.html',
  styleUrls: ['./context-menu-base.component.css']
})
export class ContextMenuBaseComponent implements AfterViewInit, OnChanges {

  @Input() x = 0;
  @Input() y = 0;

  @Output() close = new EventEmitter<void>();

  @ViewChild('menu') menu?: ElementRef<HTMLElement>;

  menuX = 0;
  menuY = 0;

  private canClose = false;
  private readonly edgePadding = 8;
  private readonly pointerOffsetX = 12;
  private readonly pointerOffsetY = 22;

  constructor(private el: ElementRef) {
    setTimeout(() => {
      this.canClose = true;
    }, 50);
  }

  ngAfterViewInit(): void {
    this.reposition();
  }

  ngOnChanges(): void {
    this.reposition();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.reposition();
  }

  @HostListener('document:click', ['$event'])
  onGlobalClick(event: MouseEvent) {
    if (!this.canClose) return;

    if (!this.el.nativeElement.contains(event.target)) {
      this.close.emit();
    }
  }

  private reposition(): void {
    this.menuX = this.x + this.pointerOffsetX;
    this.menuY = this.y + this.pointerOffsetY;

    requestAnimationFrame(() => {
      const menu = this.menu?.nativeElement;
      const parent = this.el.nativeElement.parentElement as HTMLElement | null;

      if (!menu || !parent) return;

      const parentRect = parent.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();

      let nextX = this.x + this.pointerOffsetX;
      let nextY = this.y + this.pointerOffsetY;

      if (nextX + menuRect.width > parentRect.width - this.edgePadding) {
        nextX = this.x - menuRect.width - this.pointerOffsetX;
      }

      if (nextY + menuRect.height > parentRect.height - this.edgePadding) {
        nextY = this.y - menuRect.height - this.pointerOffsetY;
      }

      this.menuX = Math.max(this.edgePadding, nextX);
      this.menuY = Math.max(this.edgePadding, nextY);
    });
  }

}
