import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop'; // ⬅️ Ez kell a huzigáláshoz

@Component({
  selector: 'app-setup-roomlist',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DragDropModule], // ⬅️ Importáld be ide
  templateUrl: './setup-roomlist.component.html',
  styleUrls: ['./setup-roomlist.component.css']
})
export class SetupRoomlistComponent implements OnInit {
  userSetups: any[] = [];
  loading: boolean = true;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<any>('http://localhost:3000/api/setup', { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          this.userSetups = response.setups || [];
          this.loading = false;
          // Itt a háttérben már megvan a darabszám: this.userSetups.length
          console.log('Setupok száma:', this.userSetups.length);
        },
        error: (err: any) => {
          console.error('Hiba:', err);
          this.loading = false;
        }
      });
  }

  get setupCount(): number {
    return this.userSetups.length;
  }
}
