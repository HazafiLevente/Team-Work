import { Component, OnInit, HostListener, ViewChild, ElementRef, Input, Output, EventEmitter, AfterViewInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {SetupDockComponent} from '../dock/dock.component';
import { WorkspaceComponent } from '../workspace/workspace.component';
import { SetupConnectionsComponent } from '../workspace/connection-layer/setup-connections.component';

type SetupItem = any;

type PcPart = {
  id: number;
  slot: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'psu' | 'other';
  source_table: string;
  display_name: string;
};

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    SetupDockComponent,
    WorkspaceComponent,
    SetupConnectionsComponent,
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit, AfterViewInit {

  ngOnInit(): void {
    this.loadUserSetups();
    this.loadGlobalConnections();
  }

  ngAfterViewInit() {
    setTimeout(() => this.updateLines(), 100);
  }

  @Input() favoriteMode = false;
  @Input() allowCreate = true;

  userSetups:any[]=[]
  items:any[]=[]
  allUserConnections:any[]=[]
  viewingSetup:any=null
  @Input() connections:any[] = [];
  @Input() globalRoomConnections:any[] = [];
  lineRefreshTrigger = 0;
  @Input() elementRegistry!: Map<string,HTMLElement>;
  @Input() boundary!: HTMLElement;
  @Input() connectMousePos:any;
  @Input() connectSourceSetup:any;
  @Input() pairingStage!:string;

  loading=false
  loadingItems=false
  private cachedBoundaryRect: DOMRect | null = null;
  private rafId: number | null = null;
  @ViewChild('boundary', { static: false })
  boundaryEl!: ElementRef<HTMLElement>;
  // context menu state
  ctxSetup: any = null;
  ctxPayload: any = null;

  // tools modal state
  toolsOpen = false;
  toolsSetup: any = null;
  toolsStartTab: 'items' | 'pc' | 'cars' = 'items';


  dockItems: { id: string; title: string }[] = [];

  constructor(private http:HttpClient){}

  private buildListUrl(): string {

    const fav = this.favoriteMode ? 'true' : 'false';

    return `/api/setup?favorite=${fav}`;

  }


  loadUserSetups(): void {

    this.loading = true;

    this.http.get<any>(this.buildListUrl(), {withCredentials:true})
      .subscribe({

        next:res=>{

          this.userSetups = res?.setups || [];
          this.loading=false;

          this.processGlobalConnections();

        },

        error:err=>{

          console.error("❌ Setup lista hiba:",err);
          this.userSetups=[];
          this.loading=false;

        }

      });

  }
  getSetupTitle(s: any): string {
    return s?.setup_name ?? s?.name ?? 'Névtelen setup';
  }
  loadPairingItems(setupId: any): void {

    this.http.get<any>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: res => {
          console.log("Pairing items:", res);
        },
        error: err => {
          console.error("❌ Pairing items loading error:", err);
        }
      });

  }

  loadGlobalConnections(): void {

    this.http.get<any[]>('/api/setup/all-connections',{withCredentials:true})
      .subscribe({

        next:conns=>{

          console.log("🔥 RAW CONNECTIONS FROM API:", conns);

          this.allUserConnections = conns || [];
          this.processGlobalConnections();

        },

        error:err=>{

          console.error("❌ all connections hiba:",err);

        }

      });

  }
  updateLines(): void {

    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {

      this.lineRefreshTrigger++;

      this.rafId = null;

    });

  }

  processGlobalConnections(): void {

    if (!this.allUserConnections.length || !this.userSetups.length) {
      this.globalRoomConnections = [];
      return;
    }

    const aggregated = new Map<string, any>();

    this.allUserConnections.forEach(conn => {

      const sId = String(conn.from_setup_id);
      const tId = String(conn.to_setup_id);

      if (sId !== tId) {

        const key = [sId, tId].sort().join('-');

        if (!aggregated.has(key)) {
          aggregated.set(key, {
            id: `global-${key}`,
            source: { category: 'setup[Setup]', id: sId },
            target: { category: 'setup[Setup]', id: tId }
          });
        }

      }

    });

    this.globalRoomConnections = Array.from(aggregated.values());

    console.log("🔥 GLOBAL ROOM CONNECTIONS:", this.globalRoomConnections);

    this.updateLines();
  }


  openSetupDetails(setup: any): void {
    if (!setup) return;

    this.viewingSetup = setup;
    this.items = [];
    this.loadingItems = true;

    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) {
      this.loadingItems = false;
      return;
    }

    this.http.get<any[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.items = Array.isArray(items) ? items : [];
          this.loadingItems = false;
        },
        error: (err) => {
          console.error('❌ children hiba:', err);
          this.items = [];
          this.loadingItems = false;
        }
      });
  }

  onRoomDragEnded(setup: any, pos: { x: number; y: number }): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) return;

    setup.x = pos.x;
    setup.y = pos.y;

    this.userSetups = this.userSetups.map(s => {
      const sid = s?.id ?? s?.setup_id ?? s?.setupId;
      return String(sid) === String(setupId)
        ? { ...s, x: pos.x, y: pos.y }
        : s;
    });

    this.http.patch(`/api/setup/rooms/${setupId}/position`, { x: pos.x, y: pos.y }, { withCredentials: true })
      .subscribe({
        next: () => {
          console.log(`✅ Room ${setupId} pozíció mentve`, pos);
        },
        error: (err) => {
          console.error('❌ pozíció mentés hiba:', err);
        }
      });
  }

  backToSetups(){

    this.viewingSetup=null;

  }


  openDockItem(item:any){

    console.log("Dock item:",item)

  }
  openToolsFromMenu(): void {
    if (!this.ctxSetup) return;

    this.toolsStartTab = 'items';
    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;
  }


  startConnectingFromMenu(setup:any): void {

    if (!setup) return;

    this.connectSourceSetup = setup;

    this.pairingStage = 'PICK_SOURCE';

    const setupId =
      setup.id ||
      setup.setup_id;

    this.loadPairingItems(setupId);

  }




  createNewSetup(customX?: number, customY?: number): void {

    if (!this.allowCreate) return;

    const setup_name = 'Új setup';

    this.http.post<any>(
      '/api/setup/create',
      {
        setup_name,
        x: customX ?? 50,
        y: customY ?? 50,
        isFavorite: this.favoriteMode
      },
      { withCredentials: true }
    )
      .subscribe({

        next: (res) => {

          const created = res?.setup;

          if (!created) return;

          if (this.viewingSetup) return;

          this.userSetups = [created, ...this.userSetups];

        },

        error: (err) => {
          console.error('❌ Setup létrehozási hiba:', err);
        }

      });

  }
  deleteSetupFromMenu(setup:any): void {

    if (!setup) return;

    const setupId =
      setup?.id ??
      setup?.setup_id ??
      setup?.setupId;

    console.log("DELETE SETUP:", setup);

    if (!setupId) return;

    const name = this.getSetupTitle(setup);
    const ok = window.confirm(`Biztos törlöd?\n\n${name}`);
    if (!ok) return;

    this.http.delete<any>(`/api/setup/${setupId}`, { withCredentials: true })
      .subscribe({
        next: () => {

          this.userSetups = this.userSetups.filter(s => {
            const sid = s?.id ?? s?.setup_id ?? s?.setupId;
            return String(sid) !== String(setupId);
          });

          const vid =
            this.viewingSetup?.id ??
            this.viewingSetup?.setup_id ??
            this.viewingSetup?.setupId;

          if (this.viewingSetup && String(vid) === String(setupId)) {
            this.backToSetups();
          }

        },
        error: (err) => {
          console.error('❌ Setup törlés hiba:', err);
          alert('Törlés sikertelen.');
        }
      });

  }
  openRenameFromMenu(setup:any): void {

    if (!setup) return;

    const id = setup.id ?? setup.setup_id ?? setup.setupId;

    setTimeout(() => {

      const el = document.querySelector(`[data-id="room:${id}"]`);

      if (!el) return;

      const comp = (el as any).__ngContext__?.[8];

      comp?.startRename?.();

    });

  }
  saveRenamedRoom(data: any): void {
    if (!data) return;

    const setupId =
      data?.id ??
      data?.setup_id ??
      data?.setupId;

    const newName =
      data?.setup_name ??
      data?.display_name ??
      data?.name;

    if (!setupId || !newName) return;

    this.http.patch<any>(
      `/api/setup/${setupId}`,
      { setup_name: newName },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const updated = res?.setup ?? { ...data, setup_name: newName };

        this.userSetups = this.userSetups.map(s => {
          const sid = s?.id ?? s?.setup_id ?? s?.setupId;
          return String(sid) === String(setupId)
            ? { ...s, ...updated, display_name: updated.setup_name }
            : s;
        });

        if (this.viewingSetup) {
          const vid =
            this.viewingSetup?.id ??
            this.viewingSetup?.setup_id ??
            this.viewingSetup?.setupId;

          if (String(vid) === String(setupId)) {
            this.viewingSetup = {
              ...this.viewingSetup,
              ...updated,
              display_name: updated.setup_name
            };
          }
        }
      },
      error: (err) => {
        console.error('❌ Setup átnevezés hiba:', err);
        alert('Átnevezés sikertelen.');
      }
    });
  }


}
