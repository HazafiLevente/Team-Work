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

type SetupList = {
  id: number;
  name: string;
  title: string;
  setupIds: number[];
  isSecret: boolean;
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

  tab: 'general' | 'items' | 'lists' | 'edit' = 'general';

  saving = false;
  listsLoading = false;
  listsSavingId: number | null = null;
  errorMsg = '';
  listsError = '';
  editName = '';
  newListName = '';
  newListPrivate = false;
  selectedListId: number | null = null;
  setupLists: SetupList[] = [];

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
      this.listsError = '';
      this.saving = false;
      this.listsSavingId = null;
      this.tab = 'general';
      this.loadSetupLists();
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

  setupId(): number | null {
    const id =
      this.setup?.id ??
      this.setup?.setup_id ??
      this.setup?.setupId;

    const numericId = Number(id);
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
  }

  isSetupInList(list: SetupList): boolean {
    const setupId = this.setupId();
    if (!setupId) return false;
    return (list.setupIds || []).some((id) => Number(id) === setupId);
  }

  loadSetupLists(): void {
    if (!this.setupId()) return;

    this.listsLoading = true;
    this.listsError = '';

    this.http.get<any>('/api/setup/lists', { withCredentials: true }).subscribe({
      next: (res) => {
        this.setupLists = Array.isArray(res?.lists)
          ? res.lists.map((list: any) => ({
            id: Number(list.id),
            name: String(list.name ?? ''),
            title: String(list.title ?? list.name ?? 'Lista'),
            isSecret: this.toBoolean(list.isSecret ?? list.is_secret ?? list.private ?? list.isPrivate),
            setupIds: Array.isArray(list.setupIds)
              ? list.setupIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
              : []
          })).filter((list: SetupList) => Number.isFinite(list.id))
          : [];
        if (!this.selectedListId || !this.planLists().some((list) => list.id === this.selectedListId)) {
          this.selectedListId = this.planLists()[0]?.id ?? null;
        }
        this.listsLoading = false;
      },
      error: (err) => {
        console.error('Lista betoltes hiba:', err);
        this.listsError = 'Listak betoltese sikertelen.';
        this.listsLoading = false;
      }
    });
  }

  favoriteList(): SetupList | null {
    return this.setupLists.find((list) => this.isFavoriteList(list)) || null;
  }

  planLists(): SetupList[] {
    return this.setupLists.filter((list) => !this.isFavoriteList(list));
  }

  selectedList(): SetupList | null {
    return this.planLists().find((list) => list.id === this.selectedListId) || null;
  }

  selectList(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.selectedListId = Number.isFinite(value) && value > 0 ? value : null;
  }

  toggleFavoriteList(): void {
    const favorite = this.favoriteList();
    if (favorite) {
      this.toggleSetupList(favorite);
      return;
    }

    const setupId = this.setupId();
    if (!setupId || this.listsSavingId) return;

    this.listsSavingId = -2;
    this.listsError = '';

    this.http.post<any>('/api/setup/lists', {
      name: 'favorite',
      title: 'Favorite',
      setupType: 'favorite',
      isFavorite: true
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        const list = res?.list;
        const normalized = {
          id: Number(list.id),
          name: String(list.name ?? 'favorite'),
          title: String(list.title ?? 'Favorite'),
          isSecret: this.toBoolean(list.isSecret ?? list.is_secret ?? false),
          setupIds: Array.isArray(list.setupIds) ? list.setupIds.map((id: any) => Number(id)) : []
        };
        this.setupLists = [...this.setupLists, normalized];
        this.listsSavingId = null;
        this.toggleSetupList(normalized);
      },
      error: (err) => {
        console.error('Favorite lista letrehozas hiba:', err);
        this.listsError = 'Favorite lista letrehozasa sikertelen.';
        this.listsSavingId = null;
      }
    });
  }

  toggleSelectedList(): void {
    const list = this.selectedList();
    if (!list) return;
    this.toggleSetupList(list);
  }

  toggleSetupList(list: SetupList): void {
    const setupId = this.setupId();
    if (!setupId || !list?.id || this.listsSavingId) return;

    const inList = this.isSetupInList(list);
    this.listsSavingId = list.id;
    this.listsError = '';

    const request = inList
      ? this.http.delete<any>(`/api/setup/lists/${list.id}/setups/${setupId}`, { withCredentials: true })
      : this.http.post<any>(`/api/setup/lists/${list.id}/setups`, { setupId }, { withCredentials: true });

    request.subscribe({
      next: () => {
        this.listsSavingId = null;
        this.loadSetupLists();
      },
      error: (err) => {
        console.error('Lista mentes hiba:', err);
        this.listsError = 'Lista mentes sikertelen.';
        this.listsSavingId = null;
      }
    });
  }

  createSetupList(): void {
    const name = this.newListName.trim();
    const setupId = this.setupId();
    if (!name || !setupId || this.listsSavingId) return;

    this.listsSavingId = -1;
    this.listsError = '';

    this.http.post<any>('/api/setup/lists', {
      name,
      title: name,
      setupType: 'plan',
      isSecret: this.newListPrivate
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        const list = res?.list;
        if (!list?.id) {
          this.listsSavingId = null;
          this.loadSetupLists();
          return;
        }

        const wasPrivate = this.newListPrivate;
        this.newListName = '';
        this.newListPrivate = false;
        this.setupLists = [
          ...this.setupLists,
          {
            id: Number(list.id),
            name: String(list.name ?? name),
            title: String(list.title ?? name),
            isSecret: this.toBoolean(list.isSecret ?? list.is_secret ?? wasPrivate),
            setupIds: Array.isArray(list.setupIds) ? list.setupIds.map((id: any) => Number(id)) : []
          }
        ];
        this.selectedListId = Number(list.id);
        this.listsSavingId = null;
        this.toggleSetupList(this.setupLists[this.setupLists.length - 1]);
      },
      error: (err) => {
        console.error('Lista letrehozas hiba:', err);
        this.listsError = 'Lista letrehozasa sikertelen.';
        this.listsSavingId = null;
      }
    });
  }

  private isFavoriteList(list: SetupList): boolean {
    const name = String(list?.name ?? '').trim().toLowerCase();
    const title = String(list?.title ?? '').trim().toLowerCase();
    return name === 'favorite' || title === 'favorite';
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

}
