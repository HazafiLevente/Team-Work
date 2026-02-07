import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SetupRoomComponent } from '../setup-room/setup-room.component';

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [CommonModule, HttpClientModule, SetupRoomComponent],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {

  userSetups: any[] = [];
  setupItems: any[] = [];

  loading = true;
  loadingItems = false;

  showModal = false;
  selectedSetup: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserSetups();
  }

  loadUserSetups(): void {
    this.loading = true;

    this.http.get<any>('http://localhost:3000/api/setup', {
      withCredentials: true
    }).subscribe({
      next: res => {
        console.log("🟢 Setup lista:", res);
        this.userSetups = res.setups || [];
        this.loading = false;
      },
      error: err => {
        console.error("❌ Setup lista hiba:", err);
        this.loading = false;
      }
    });
  }

  onChildSetupClick(setup: any): void {
    console.log("🟦 DblClick setup:", setup);

    const setupId = setup.id ?? setup.setup_id;

    if (!setupId) {
      console.error("❌ Nincs setup ID");
      return;
    }

    this.selectedSetup = setup;
    this.showModal = true;
    this.loadingItems = true;
    this.setupItems = [];

    this.http.get<any[]>(
      `http://localhost:3000/api/setup/${setupId}/children`,
      { withCredentials: true }
    ).subscribe({
      next: items => {
        console.log("🟢 Kapott itemek:", items);
        this.setupItems = items || [];
        this.loadingItems = false;
      },
      error: err => {
        console.error("❌ Item hiba:", err);
        this.setupItems = [];
        this.loadingItems = false;
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedSetup = null;
  }
}
