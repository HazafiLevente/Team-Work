import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type UiItem = {
  category: string;
  display_name: string;
  manufacturer?: string;
};

@Component({
  selector: 'app-setup-properties-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './setup-properties-modal.component.html',
  styleUrls: ['./setup-properties-modal.component.css']
})
export class SetupPropertiesModalComponent {

  // ===== INPUTOK =====
  @Input() setup: any;
  @Input() items: UiItem[] = [];
  @Input() loadingItems = false;

  // ===== OUTPUTOK =====
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  // ===== STATE =====
  tab: 'general' | 'items' | 'edit' = 'general';

  saving = false;
  errorMsg = '';

  editName = '';

  constructor(private http: HttpClient) {}

  // ===== LIFECYCLE =====
  ngOnChanges(): void {
    this.editName = this.setup?.setup_name ?? this.setup?.name ?? '';
    this.errorMsg = '';
    this.saving = false;
    this.tab = 'general';
  }

  // ===== TEMPLATE METÓDUSOK =====

  onBackdropClick(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  title(): string {
    return this.setup?.setup_name ?? this.setup?.name ?? 'Tulajdonságok';
  }

  // ===== MENTÉS =====
  saveChanges(): void {
    const setupId =
      this.setup?.id ??
      this.setup?.setup_id ??
      this.setup?.setupId;

    if (!setupId) return;

    const name = (this.editName || '').trim();
    if (!name) {
      this.errorMsg = 'A setup neve nem lehet üres.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';

    this.http
      .patch<any>(
        `/api/setup/${setupId}`,
        { setup_name: name },
        { withCredentials: true }
      )
      .subscribe({
        next: (res) => {
          const updated = res?.setup ?? {
            ...this.setup,
            setup_name: name,
            name
          };

          this.saved.emit(updated);
          this.setup = updated;
          this.tab = 'general';
          this.saving = false;
        },
        error: (err) => {
          console.error('❌ Setup mentési hiba:', err);
          this.errorMsg = 'Mentés sikertelen.';
          this.saving = false;
        }
      });
  }
}
