import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { SetupRoomComponent, SetupRightClickPayload } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupToolsModalComponent } from '../setup-tools-modal/setup-tools-modal.component';

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    SetupRoomComponent,
    DotGridComponent,
    SetupToolsModalComponent
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {

  userSetups: any[] = [];
  loading = true;

  // ✅ Context menu state
  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxSetup: any = null;

  // ✅ Tools modal state
  toolsOpen = false;
  toolsSetup: any = null;

  // ✅ workspace ref (#boundary)
  @ViewChild('boundary', { static: true }) boundaryEl!: ElementRef<HTMLElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserSetups();
  }

  loadUserSetups(): void {
    this.loading = true;

    this.http.get<any>('/api/setup', { withCredentials: true })
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

  // ✅ JOBB KLIKK: csak a menü nyíljon le (pontos pozícióval a workspace-en belül)
  openContextMenu(payload: SetupRightClickPayload): void {
    this.ctxSetup = payload?.setup ?? null;

    const host = this.boundaryEl?.nativeElement;
    if (!host) return;

    const rect = host.getBoundingClientRect();

    // koordináta a workspace-hez képest
    const localX = payload.x - rect.left;
    const localY = payload.y - rect.top;

    // clamp a workspace határain belül
    const MENU_W = 220;
    const MENU_H = 240;
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

  // ✅ ESC-re zárjuk a menüt (és a modalt is)
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.ctxOpen) this.closeContextMenu();
    if (this.toolsOpen) this.closeTools();
  }

  // ✅ CSAK az "Eszközök" menüpont működik most
  openToolsFromMenu(): void {
    if (!this.ctxSetup) return;

    this.toolsSetup = this.ctxSetup;
    this.toolsOpen = true;

    // menü zárása
    this.closeContextMenu();
  }

  closeTools(): void {
    this.toolsOpen = false;
    this.toolsSetup = null;
  }
}
