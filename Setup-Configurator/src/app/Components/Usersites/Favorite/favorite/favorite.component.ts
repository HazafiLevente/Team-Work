import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { DotGridComponent } from '../../../Shared/Background/dot-grid.component';

@Component({
  selector: 'app-favorite',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DotGridComponent],
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.css']
})
export class FavoriteComponent implements OnInit {

  favorites: any[] = [];
  loading = true;

  @ViewChild('boundary', { static: true }) boundaryEl!: ElementRef<HTMLElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.loading = true;

    this.http.get<any>('/api/setup/favorites', { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.favorites = res?.setups || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Favorites load hiba:', err);
          this.favorites = [];
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
}
