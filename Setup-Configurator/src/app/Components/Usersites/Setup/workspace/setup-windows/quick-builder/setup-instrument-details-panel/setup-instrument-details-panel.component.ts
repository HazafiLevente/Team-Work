import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type InstrumentRow = {
  key: string;
  label: string;
  value: any;
};

@Component({
  selector: 'app-setup-instrument-details-panel',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './setup-instrument-details-panel.component.html',
  styleUrls: ['./setup-instrument-details-panel.component.css']
})
export class SetupInstrumentDetailsPanelComponent implements OnChanges {
  @Input() instrumentItem: any = null;
  @Output() close = new EventEmitter<void>();
  @ViewChild('panelEl', { static: false }) panelEl?: ElementRef<HTMLElement>;

  loading = false;
  errorMsg = '';
  rows: InstrumentRow[] = [];

  panelX = 24;
  panelY = 110;
  dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['instrumentItem']) {
      this.loadInstrumentDetails();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  startDrag(event: MouseEvent): void {
    const boundary = document.querySelector('.setup-workspace .boundary-area') as HTMLElement | null;
    const boundaryRect = boundary?.getBoundingClientRect();

    if (boundaryRect) {
      const localMouseX = event.clientX - boundaryRect.left;
      const localMouseY = event.clientY - boundaryRect.top;

      this.dragOffsetX = localMouseX - this.panelX;
      this.dragOffsetY = localMouseY - this.panelY;
    } else {
      this.dragOffsetX = event.clientX - this.panelX;
      this.dragOffsetY = event.clientY - this.panelY;
    }

    this.dragging = true;
    event.preventDefault();
  }

  onDrag(event: MouseEvent): void {
    if (!this.dragging) return;

    const boundary = document.querySelector('.setup-workspace .boundary-area') as HTMLElement | null;
    const boundaryRect = boundary?.getBoundingClientRect();
    const panelRect = this.panelEl?.nativeElement.getBoundingClientRect();

    if (!boundaryRect) {
      const nextX = event.clientX - this.dragOffsetX;
      const nextY = event.clientY - this.dragOffsetY;

      this.panelX = Math.max(0, nextX);
      this.panelY = Math.max(0, nextY);
      return;
    }

    const panelWidth = panelRect?.width ?? 360;
    const panelHeight = panelRect?.height ?? 300;

    const localMouseX = event.clientX - boundaryRect.left;
    const localMouseY = event.clientY - boundaryRect.top;

    const nextX = localMouseX - this.dragOffsetX;
    const nextY = localMouseY - this.dragOffsetY;

    const maxX = Math.max(0, boundaryRect.width - panelWidth - 8);
    const maxY = Math.max(0, boundaryRect.height - panelHeight - 8);

    this.panelX = Math.min(Math.max(0, nextX), maxX);
    this.panelY = Math.min(Math.max(0, nextY), maxY);
  }

  stopDrag(): void {
    this.dragging = false;
  }

  title(): string {
    const it = this.instrumentItem;
    return it?.display_name || it?.name || it?.setup_name || it?.title || 'Hangszer';
  }

  private loadInstrumentDetails(): void {
    this.rows = [];
    this.errorMsg = '';
    if (!this.instrumentItem) return;

    // Egyelőre csak a nevet jelenítjük meg egy sorban a kérés szerint
    this.rows = [
      {
        key: 'name',
        label: 'Név',
        value: this.title()
      }
    ];
  }
}
