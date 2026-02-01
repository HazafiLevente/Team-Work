import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // Importáld a HttpClient-et

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {
  userSetups: any[] = [];
  loading: boolean = true;

  constructor(private http: HttpClient) { } // Injektáld be közvetlenül

  ngOnInit(): void {
    // Közvetlen API hívás a backend felé
    this.http.get<any>('http://localhost:3000/api/setup', { withCredentials: true })
      .subscribe({
        next: (response) => {
          this.userSetups = response.setups || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Hiba történt:', err);
          this.loading = false;
        }
      });
  }

  // Ez a getter javítja ki a HTML-ben lévő TS2339 hibát
  get setupCount(): number {
    return this.userSetups.length;
  }
}
