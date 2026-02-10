import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type UiItem = {
  category: string;
  display_name: string;
  manufacturer?: string;
};

@Component({
  selector: 'app-setup-tools-modal',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './setup-tools-modal.component.html',
  styleUrls: ['./setup-tools-modal.component.css']
})
export class SetupToolsModalComponent implements OnChanges {

  @Input() setup: any;

  @Output() close = new EventEmitter<void>();

  loading = false;
  items: UiItem[] = [];
  errorMsg = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['setup']) return;
    if (!this.setup) return;

    this.loadItems();
  }

  private loadItems(): void {
    const setupId = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    if (!setupId) return;

    this.loading = true;
    this.items = [];
    this.errorMsg = '';

    this.http.get<UiItem[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.items = Array.isArray(items) ? items : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Tools modal children hiba:', err);
          this.items = [];
          this.loading = false;
          this.errorMsg = 'Betöltés sikertelen.';
        }
      });
  }

  title(): string {
    return this.setup?.setup_name ?? this.setup?.name ?? 'Névtelen setup';
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }
}
