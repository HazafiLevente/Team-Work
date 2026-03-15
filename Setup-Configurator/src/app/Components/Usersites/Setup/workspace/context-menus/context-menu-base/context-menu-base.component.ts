import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-context-menu-base',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context-menu-base.component.html',
  styleUrls: ['./context-menu-base.component.css']
})
export class ContextMenuBaseComponent {

  @Input() x = 0;
  @Input() y = 0;

  @Output() close = new EventEmitter<void>();

  private canClose = false;

  constructor(private el: ElementRef) {
    setTimeout(() => {
      this.canClose = true;
    }, 50);
  }

  @HostListener('document:click', ['$event'])
  onGlobalClick(event: MouseEvent) {
    if (!this.canClose) return;

    if (!this.el.nativeElement.contains(event.target)) {
      this.close.emit();
    }
  }

}
