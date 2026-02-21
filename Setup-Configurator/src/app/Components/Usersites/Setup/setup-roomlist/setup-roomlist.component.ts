
import { Component, OnInit, HostListener, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { SetupRoomComponent, SetupRightClickPayload } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupToolsModalComponent } from '../setup-tools-modal/setup-tools-modal.component';

type SetupItem = any;

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

  @Input() favoriteMode = false;
  @Input() allowCreate = true;

  // -------------------------
  // LISTA NÉZET (setup kártyák)
  // -------------------------
  userSetups: any[] = [];
  loading = true;

  // -------------------------
  // RÉSZLETEK NÉZET (setup elemei)
  // -------------------------
  viewingSetup: any = null;        // ha nem null -> details view
  loadingItems = false;
  items: SetupItem[] = [];
  itemsError = '';
  connections: any[] = [];

  // ✅ Context menu state
  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;

  // ✅ Tools modal state
  toolsOpen = false;
  toolsSetup: any = null;
  toolsStartTab: 'items' | 'pc' | 'cars' = 'items';

  // ✅ Rename modal state
  renameOpen = false;
  renameSetup: any = null;
  renameValue = '';
  renameSaving = false;
  renameError = '';

  @ViewChild('boundary', { static: true }) boundaryEl!: ElementRef<HTMLElement>;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadUserSetups();
  }

  private buildListUrl(): string {
    const fav = this.favoriteMode ? 'true' : 'false';
    return `/api/setup?favorite=${fav}`;
  }

  loadUserSetups(): void {
    this.loading = true;

    this.http.get<any>(this.buildListUrl(), { withCredentials: true })
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

  // ✅ items track
  trackByItem(index: number, it: any): any {
    return `${it?.category ?? 'x'}:${it?.id ?? index}`;
  }

  isNetworkSetup(s: any): boolean {
    return String(s?.isNetwork).toLowerCase() === 'true' || s?.isNetwork === true;
  }

  // -------------------------
  // ✅ ÚJ SETUP (csak ha allowCreate)
  // -------------------------
  createNewSetup(): void {
    if (!this.allowCreate) return;

    const setup_name = 'Új setup';

    this.http.post<any>(
      '/api/setup/create',
      { setup_name },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const created = res?.setup;
        if (!created) return;

        if (this.favoriteMode) return; // favorite nézetben ne jelenjen meg alapból

        this.userSetups = [created, ...this.userSetups];
      },
      error: (err) => {
        console.error('❌ Setup létrehozási hiba:', err);
      }
    });
  }

  // -------------------------
  // ✅ DUPLA KATT -> DETAIL VIEW
  // -------------------------
  openSetupDetails(setup: any): void {
    if (!setup) return;

    this.viewingSetup = setup;
    this.items = [];
    this.itemsError = '';
    this.loadingItems = true;

    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) {
      this.loadingItems = false;
      this.itemsError = 'Hiányzó setup ID.';
      return;
    }

    this.http.get<any[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.items = Array.isArray(items) ? items : [];
          this.loadingItems = false;
          this.loadConnections(setupId);
        },
        error: (err) => {
          console.error('❌ children hiba:', err);
          this.items = [];
          this.loadingItems = false;
          this.itemsError = 'Betöltés sikertelen.';
        }
      });
  }

  loadConnections(setupId: any): void {
    this.http.get<any[]>(`/api/setup/${setupId}/connections`, { withCredentials: true })
      .subscribe({
        next: (conns) => {
          this.connections = Array.isArray(conns) ? conns : [];
        },
        error: (err) => {
          console.error('❌ connections hiba:', err);
          this.connections = [];
        }
      });
  }

  lineRefreshTrigger = 0;
  updateLines(): void {
    // Force Change Detection for SVG layer
    this.lineRefreshTrigger++;
  }

  getLinePath(conn: any, _trigger?: any): string {
    const sId = `${conn.source.category}:${conn.source.id}`;
    const tId = `${conn.target.category}:${conn.target.id}`;

    const sEl = document.querySelector(`[data-id="${sId}"]`) as HTMLElement;
    const tEl = document.querySelector(`[data-id="${tId}"]`) as HTMLElement;

    if (!sEl || !tEl) return '';

    const rect = this.boundaryEl.nativeElement.getBoundingClientRect();
    const sRect = sEl.getBoundingClientRect();
    const tRect = tEl.getBoundingClientRect();

    const x1 = sRect.left + sRect.width / 2 - rect.left;
    const y1 = sRect.top + sRect.height / 2 - rect.top;
    const x2 = tRect.left + tRect.width / 2 - rect.left;
    const y2 = tRect.top + tRect.height / 2 - rect.top;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // ✅ Vissza gomb
  backToSetups(): void {
    this.viewingSetup = null;
    this.items = [];
    this.itemsError = '';
    this.loadingItems = false;

    // safety: context/menu/modalok zárása
    if (this.ctxOpen) this.closeContextMenu();
    if (this.toolsOpen) this.closeTools();
    if (this.renameOpen) this.closeRename();
  }

  // -------------------------
  // ✅ Jobb klikk menü pozíció
  // -------------------------
  openContextMenu(payload: SetupRightClickPayload): void {
    this.ctxSetup = payload?.setup ?? null;

    const host = this.boundaryEl?.nativeElement;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const localX = payload.x - rect.left;
    const localY = payload.y - rect.top;

    const MENU_W = 260;
    const MENU_H = 360; // ✅ kicsit magasabb (Cars + PC miatt)
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

  // ✅ ESC
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.ctxOpen) this.closeContextMenu();
    if (this.toolsOpen) this.closeTools();
    if (this.renameOpen) this.closeRename();

    // ✅ ha részletek nézetben vagyunk, ESC = vissza
    if (this.viewingSetup) this.backToSetups();
  }

  // ✅ Tools
  openToolsFromMenu(): void {
    if (!this.ctxSetup) return;

    this.toolsStartTab = 'items';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  // ✅ PC Builder (csak ha NEM network)
  openPcBuilderFromMenu(): void {
    if (!this.ctxSetup) return;
    if (this.isNetworkSetup(this.ctxSetup)) return;

    this.toolsStartTab = 'pc';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  // ✅ Cars (csak ha NEM network)
  openCarsFromMenu(): void {
    if (!this.ctxSetup) return;
    if (this.isNetworkSetup(this.ctxSetup)) return;

    this.toolsStartTab = 'cars';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    this.closeContextMenu();
  }

  closeTools(): void {
    this.toolsOpen = false;
    this.toolsSetup = null;
    this.toolsStartTab = 'items';
  }

  // ✅ Rename
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
          return String(sid) === String(id) ? { ...s, ...updated } : s;
        });

        // ha épp azt nézzük, amit átneveztünk, frissítsük a header-t is
        if (this.viewingSetup) {
          const vid = this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId;
          if (String(vid) === String(id)) {
            this.viewingSetup = { ...this.viewingSetup, ...updated };
          }
        }

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

  // ✅ TÖRLÉS
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
            return String(sid) !== String(setupId);
          });

          // ha épp ezt néztük detailben, lépjünk vissza
          const vid = this.viewingSetup?.id ?? this.viewingSetup?.setup_id ?? this.viewingSetup?.setupId;
          if (this.viewingSetup && String(vid) === String(setupId)) {
            this.backToSetups();
          }

          this.closeContextMenu();
        },
        error: (err) => {
          console.error('❌ Setup törlés hiba:', err);
          alert('Törlés sikertelen.');
        }
      });
  }
}
