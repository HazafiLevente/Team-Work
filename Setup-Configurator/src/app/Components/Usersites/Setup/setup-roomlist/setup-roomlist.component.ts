import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { SetupRoomComponent } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';
import { SetupPropertiesModalComponent } from '../setup-properties/setup-properties-modal.component';// ✅ ÚJ


type UiItem = { category: string; display_name: string; manufacturer?: string };

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    SetupRoomComponent,
    DotGridComponent,
    SetupPropertiesModalComponent // ✅ ÚJ
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {

  positions: Record<string, { x: number; y: number }> = {};

  userSetups: any[] = [];
  loading = true;

  selectedSetup: any = null;

  setupItems: UiItem[] = [];
  loadingItems = false;

  // ✅ Tulajdonságok ablak state
  propertiesOpen = false;
  propertiesSetup: any = null;
  propertiesItems: UiItem[] = [];
  propertiesLoading = false;

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

  onChildSetupClick(setup: any): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) return;

    this.selectedSetup = setup;
    this.loadingItems = true;
    this.setupItems = [];

    this.http.get<UiItem[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.setupItems = Array.isArray(items) ? items : [];
          this.loadingItems = false;
        },
        error: (err) => {
          console.error('❌ children hiba:', err);
          this.setupItems = [];
          this.loadingItems = false;
        }
      });
  }

  // ✅ JOBB KLIKK: tulajdonságok megnyitása + items betöltése a modalba
  openProperties(setup: any): void {
    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) return;

    this.propertiesSetup = { ...setup };
    this.propertiesOpen = true;

    this.propertiesLoading = true;
    this.propertiesItems = [];

    this.http.get<UiItem[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.propertiesItems = Array.isArray(items) ? items : [];
          this.propertiesLoading = false;
        },
        error: (err) => {
          console.error('❌ properties children hiba:', err);
          this.propertiesItems = [];
          this.propertiesLoading = false;
        }
      });
  }

  closeProperties(): void {
    this.propertiesOpen = false;
    this.propertiesSetup = null;
    this.propertiesItems = [];
    this.propertiesLoading = false;
  }

  // ✅ ha mentés történt, frissítsük a listát is, hogy az új név látszódjon
  onPropertiesSaved(updatedSetup: any): void {
    const id = updatedSetup?.id ?? updatedSetup?.setup_id ?? updatedSetup?.setupId;
    if (!id) return;

    this.userSetups = this.userSetups.map(s => {
      const sid = s?.id ?? s?.setup_id ?? s?.setupId;
      return sid === id ? { ...s, ...updatedSetup } : s;
    });

    // ha épp a jobb panelen is ez van kiválasztva, frissítjük azt is
    const selId = this.selectedSetup?.id ?? this.selectedSetup?.setup_id ?? this.selectedSetup?.setupId;
    if (selId === id) {
      this.selectedSetup = { ...this.selectedSetup, ...updatedSetup };
    }
  }

  closeModal(): void {
    this.selectedSetup = null;
    this.setupItems = [];
    this.loadingItems = false;
  }

  getSetupTitle(s: any): string {
    return s?.setup_name ?? s?.name ?? 'Névtelen setup';
  }
}
