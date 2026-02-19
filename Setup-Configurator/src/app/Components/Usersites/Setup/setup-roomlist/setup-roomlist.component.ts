import { Component, OnInit, HostListener, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { SetupRoomComponent, SetupRightClickPayload } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupToolsModalComponent } from '../setup-tools-modal/setup-tools-modal.component';

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    SetupRoomComponent,
    DotGridComponent,
    SetupToolsModalComponent
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {

  // ✅ my = isFavorite false, favorite = isFavorite true
  @Input() mode: 'my' | 'favorite' = 'my';

  userSetups: any[] = [];
  loading = true;

  // Context menu
  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;

  // Tools modal
  toolsOpen = false;
  toolsSetup: any = null;
  toolsStartTab: 'items' | 'pc' = 'items';

  // Rename modal
  renameOpen = false;
  renameSetup: any = null;
  renameValue = '';
  renameSaving = false;
  renameError = '';

  @ViewChild('boundary', { static: true }) boundaryEl!: ElementRef<HTMLElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserSetups();
  }

  private get isFavoriteMode(): boolean {
    return this.mode === 'favorite';
  }

  private isNetworkSetup(s: any): boolean {
    return s?.isNetwork === true;
  }

  loadUserSetups(): void {
    this.loading = true;

    // ✅ backend: /api/setup?favorite=true|false  (isFavorite oszlop!)
    const fav = this.isFavoriteMode ? 'true' : 'false';

    this.http.get<any>(`/api/setup?favorite=${fav}`, { withCredentials: true })
      .subscribe({
        next: res => {
          this.userSetups = res?.setups || [];
          this.loading = false;
        },
        error: err => {
          console.error('❌ Setup lista hiba:', err);
          this.userSetups = [];
          this.loading = false;
        }
      });
  }

  trackBySetup(index: number, setup: any): any {
    return setup?.id ?? setup?.setup_id ?? setup?.setupId ?? index;
  }

  getSetupTitle(s: any): string {
    return s?.setup_name ?? s?.name ?? 'Névtelen setup';
  }

  // ✅ ÚJ SETUP: favorite oldalon automatikusan isFavorite=true
  createNewSetup(): void {
    const setup_name = 'Új setup';

    this.http.post<any>(
      '/api/setup/create',
      {
        setup_name,
        isFavorite: this.isFavoriteMode,
        isNetwork: false
      },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const created = res?.setup;
        if (!created) return;
        this.userSetups = [created, ...this.userSetups];
      },
      error: (err) => {
        console.error('❌ Setup létrehozási hiba:', err);
      }
    });
  }

  // Jobb klikk menü pozíció
  openContextMenu(payload: SetupRightClickPayload): void {
    this.ctxSetup = payload?.setup ?? null;

    const host = this.boundaryEl?.nativeElement;
    if (!host) return;

    const rect = host.getBoundingClientRect();

    const localX = payload.x - rect.left;
    const localY = payload.y - rect.top;

    const MENU_W = 260;
    const MENU_H = this.isNetworkSetup(this.ctxSetup) ? 190 : 320;
    const pad = 8;

    const maxX = Math.max(pad, rect.width - MENU_W - pad);
    const maxY = Math.max(pad, rect.height - MENU_H - pad);

    this.ctxX = Math.min(Math.max(localX, pad), maxX);
    this.ctxY = Math.min(Math.max(localY, pad), maxY);

    this.ctxOpen = true;
  }

  closeContextMenu(): void {
    this.ctxOpen = false;
    this.ctxSetup = null;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.ctxOpen) this.closeContextMenu();
    if (this.toolsOpen) this.closeTools();
    if (this.renameOpen) this.closeRename();
  }

  openToolsFromMenu(): void {
    if (!this.ctxSetup) return;

    this.toolsStartTab = 'items';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  // ✅ PC builder csak ha NEM network
  openPcBuilderFromMenu(): void {
    if (!this.ctxSetup) return;
    if (this.isNetworkSetup(this.ctxSetup)) return;

    this.toolsStartTab = 'pc';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  closeTools(): void {
    this.toolsOpen = false;
    this.toolsSetup = null;
    this.toolsStartTab = 'items';
  }

  openRenameFromMenu(): void {
    if (!this.ctxSetup) return;

    this.renameSetup = this.ctxSetup;
    this.renameValue = this.getSetupTitle(this.ctxSetup);
    this.renameError = '';
    this.renameSaving = false;
    this.renameOpen = true;

    this.closeContextMenu();
  }

  closeRename(): void {
    this.renameOpen = false;
    this.renameSetup = null;
    this.renameValue = '';
    this.renameSaving = false;
    this.renameError = '';
  }

  saveRename(): void {
    if (!this.renameSetup) return;

    const setupId =
      this.renameSetup?.id ??
      this.renameSetup?.setup_id ??
      this.renameSetup?.setupId;

    const name = (this.renameValue || '').trim();
    if (!name) {
      this.renameError = 'A név nem lehet üres.';
      return;
    }

    this.renameSaving = true;
    this.renameError = '';

    this.http.patch<any>(
      `/api/setup/${setupId}`,
      { setup_name: name },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const updated = res?.setup ?? { ...this.renameSetup, setup_name: name };

        const id = updated?.id ?? updated?.setup_id ?? updated?.setupId ?? setupId;

        this.userSetups = this.userSetups.map(s => {
          const sid = s?.id ?? s?.setup_id ?? s?.setupId;
          return sid === id ? { ...s, ...updated } : s;
        });

        this.renameSaving = false;
        this.closeRename();
      },
      error: (err) => {
        console.error('❌ Rename hiba:', err);
        this.renameError = 'Mentés sikertelen.';
        this.renameSaving = false;
      }
    });
  }

  deleteSetupFromMenu(): void {
    if (!this.ctxSetup) return;

    const setupId =
      this.ctxSetup?.id ??
      this.ctxSetup?.setup_id ??
      this.ctxSetup?.setupId;

    if (!setupId) return;

    const name = this.getSetupTitle(this.ctxSetup);
    const ok = window.confirm(`Biztos törlöd?\n\n${name}`);
    if (!ok) return;

    this.http.delete<any>(`/api/setup/${setupId}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.userSetups = this.userSetups.filter(s => {
            const sid = s?.id ?? s?.setup_id ?? s?.setupId;
            return sid !== setupId;
          });

          this.closeContextMenu();
        },
        error: (err) => {
          console.error('❌ Setup törlés hiba:', err);
          alert('Törlés sikertelen.');
        }
      });
  }
}
