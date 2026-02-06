import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SetupRoomComponent } from '../setup-room/setup-room.component'; // <--- ELÉRÉSI ÚT ELLENŐRZÉSE!

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    SetupRoomComponent
  ],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {
  userSetups: any[] = [];
  loading: boolean = true;

  // Modal változók
  showModal: boolean = false;
  selectedSetup: any = null;
  setupItems: any[] = [];
  loadingItems: boolean = false;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadUserSetups();
  }

  loadUserSetups(): void {
    this.loading = true;
    this.http.get<any>('http://localhost:3000/api/setup', { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.userSetups = res.setups || [];
          this.loading = false;
        },
        error: (err) => { console.error(err); this.loading = false; }
      });
  }

  // EZT HÍVJA A GYEREK
  onChildSetupClick(setup: any): void {
    console.log("Kattintás érzékelve:", setup.setup_name);

    this.selectedSetup = setup;
    this.showModal = true;
    this.setupItems = [];
    this.loadingItems = true;

    // Itt hívjuk a javított backend végpontot
    this.http.get<any[]>(`http://localhost:3000/api/setup/${setup.id}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          console.log("Adatok érkeztek:", items);
          this.setupItems = items || [];
          this.loadingItems = false;
        },
        error: (err) => {
          console.error("Hiba az itemek lekérésekor:", err);
          this.loadingItems = false;
        }
      });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedSetup = null;
  }
}
