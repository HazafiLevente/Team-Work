import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ContextMenuBaseComponent } from '../context-menu-base/context-menu-base.component';

type SetupList = {
  id: number;
  name: string;
  title: string;
  setupIds: number[];
  isSecret: boolean;
};

@Component({
  selector: 'app-context-menu-room',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ContextMenuBaseComponent],
  templateUrl: './context-menu-room.component.html',
  styleUrl: './context-menu-room.component.css'
})
export class ContextMenuRoomComponent {

  @Input() x = 0;
  @Input() y = 0;
  @Input() setup: any;

  @Output() close = new EventEmitter<void>();

  @Output() openSetup = new EventEmitter<void>();
  @Output() openTools = new EventEmitter<void>();
  @Output() rename = new EventEmitter<void>();
  @Output() connect = new EventEmitter<void>();
  @Output() connections = new EventEmitter<void>();
  @Output() deleteSetup = new EventEmitter<void>();

  listsOpen = false;
  listsLoading = false;
  listsError = '';
  listsSavingId: number | null = null;
  setupLists: SetupList[] = [];
  selectedListId: number | null = null;
  newListName = '';
  newListPrivate = false;

  constructor(private http: HttpClient) {}

  emitAndClose(emitter: EventEmitter<void>) {
    emitter.emit();
    this.close.emit();
  }

  setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    const numericId = Number(id);
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
  }

  toggleLists(event: MouseEvent): void {
    event.stopPropagation();
    this.listsOpen = !this.listsOpen;
    if (this.listsOpen && !this.setupLists.length) {
      this.loadLists();
    }
  }

  loadLists(): void {
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
        console.error('Context lista betoltes hiba:', err);
        this.listsError = this.apiErrorMessage(err, 'Listak betoltese sikertelen.');
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

  isSetupInList(list: SetupList): boolean {
    const setupId = this.setupId();
    if (!setupId) return false;
    return (list.setupIds || []).some((id) => Number(id) === setupId);
  }

  selectList(event: Event): void {
    event.stopPropagation();
    const value = Number((event.target as HTMLSelectElement).value);
    this.selectedListId = Number.isFinite(value) && value > 0 ? value : null;
  }

  toggleFavoriteList(event: MouseEvent): void {
    event.stopPropagation();
    const favorite = this.favoriteList();
    if (favorite) {
      this.toggleSetupList(favorite);
      return;
    }

    this.listsSavingId = -2;
    this.http.post<any>('/api/setup/lists', {
      name: 'favorite',
      title: 'Favorite',
      setupType: 'favorite',
      isFavorite: true
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        const list = this.normalizeList(res?.list, 'Favorite');
        this.setupLists = [...this.setupLists, list];
        this.listsSavingId = null;
        this.toggleSetupList(list);
      },
      error: (err) => {
        this.listsError = this.apiErrorMessage(err, 'Favorite lista letrehozasa sikertelen.');
        this.listsSavingId = null;
      }
    });
  }

  toggleSelectedList(event: MouseEvent): void {
    event.stopPropagation();
    const list = this.selectedList();
    if (!list) return;
    this.toggleSetupList(list);
  }

  togglePlanList(event: MouseEvent, list: SetupList): void {
    event.stopPropagation();
    this.toggleSetupList(list);
  }

  createSetupList(event: MouseEvent): void {
    event.stopPropagation();
    const name = this.newListName.trim();
    if (!name || this.listsSavingId) return;

    this.listsSavingId = -1;
    this.http.post<any>('/api/setup/lists', {
      name,
      title: name,
      setupType: 'plan',
      isSecret: this.newListPrivate
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        const list = this.normalizeList(res?.list, name);
        this.newListName = '';
        this.newListPrivate = false;
        this.setupLists = [...this.setupLists, list];
        this.selectedListId = list.id;
        this.listsSavingId = null;
        this.toggleSetupList(list);
      },
      error: (err) => {
        this.listsError = this.apiErrorMessage(err, 'Lista letrehozasa sikertelen.');
        this.listsSavingId = null;
      }
    });
  }

  private toggleSetupList(list: SetupList): void {
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
        this.loadLists();
      },
      error: (err) => {
        this.listsError = this.apiErrorMessage(err, 'Lista mentes sikertelen.');
        this.listsSavingId = null;
      }
    });
  }

  private apiErrorMessage(err: any, fallback: string): string {
    const details = err?.error?.details || err?.error?.error || err?.message;
    return details ? `${fallback} ${details}` : fallback;
  }

  private normalizeList(list: any, fallbackName: string): SetupList {
    return {
      id: Number(list?.id),
      name: String(list?.name ?? fallbackName),
      title: String(list?.title ?? fallbackName),
      isSecret: this.toBoolean(list?.isSecret ?? list?.is_secret ?? this.newListPrivate),
      setupIds: Array.isArray(list?.setupIds) ? list.setupIds.map((id: any) => Number(id)) : []
    };
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
