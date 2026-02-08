import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { SetupRoomComponent } from '../setup-room/setup-room.component';
import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';

type UiItem = { category: string; display_name: string; manufacturer?: string };

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [CommonModule, HttpClientModule, SetupRoomComponent, DotGridComponent],
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserSetups();
  }

  loadUserSetups(): void {
    this.loading = true;

    this.http.get<any>('http://localhost:3000/api/setup', { withCredentials: true })
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
    console.log('🟦 ROOMLIST kapott dbl:', setup);

    const setupId = setup?.id ?? setup?.setup_id ?? setup?.setupId;
    if (!setupId) {
      console.error('❌ Nincs setupId:', setup);
      return;
    }

    this.selectedSetup = setup;
    this.loadingItems = true;
    this.setupItems = [];

    this.http.get<UiItem[]>(`http://localhost:3000/api/setup/${setupId}/children`, {
      withCredentials: true
    }).subscribe({
      next: (items) => {
        console.log('🟢 children items:', items);
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

  closeModal(): void {
    this.selectedSetup = null;
    this.setupItems = [];
    this.loadingItems = false;
  }

  getSetupTitle(s: any): string {
    return s?.setup_name ?? s?.name ?? 'Névtelen setup';
  }
}
