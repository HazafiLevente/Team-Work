import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges
} from '@angular/core';
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

  @Input() setup: any;
  @Input() items: UiItem[] = [];
  @Input() loadingItems = false;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  tab: 'general' | 'items' | 'edit' = 'general';

  saving = false;
  errorMsg = '';
  editName = '';

  private lastSetupKey: string | number | null = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['setup']) return;

    const key =
      this.setup?.id ??
      this.setup?.setup_id ??
      this.setup?.setupId ??
      null;

    const isNewSetup = key !== this.lastSetupKey;
    this.lastSetupKey = key;

    if (isNewSetup) {
      this.editName =
        this.setup?.setup_name ??
        this.setup?.name ??
        '';

      this.errorMsg = '';
      this.saving = false;
      this.tab = 'general';
    }
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  title(): string {
    return this.setup?.setup_name ??
      this.setup?.name ??
      'Tulajdonságok';
  }

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

    const keepTab = this.tab;

    this.http
      .patch<any>(
        `/api/setup/${setupId}/update-setup`,
        { setup_name: name },
        { withCredentials: true }
      )
      .subscribe({
        next: (res) => {
          const updated = res?.setup ?? {
            ...this.setup,
            setup_name: name
          };

          this.saved.emit(updated);
          this.setup = { ...this.setup, ...updated };

          this.saving = false;
          this.tab = keepTab;
        },
        error: (err) => {
          console.error('❌ Setup mentési hiba:', err);
          this.errorMsg = 'Mentés sikertelen.';
          this.saving = false;
          this.tab = keepTab;
        }
      });
  }

}
