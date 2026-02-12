import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API = '/api';

  constructor(private http: HttpClient) {}

  getProducts(limit = 20) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/products`,
      { params: { limit: String(limit) }, withCredentials: true }
    );
  }

  getProductDetails(table: string, id: string | number) {
    const t = String(table);
    const sid = String(id);

    const carTables = new Set([
      'cabrio_cars','coupe_cars','crossover_cars','hatchback_cars','mpv_cars','pickup_cars','wagon_cars'
    ]);

    const url = carTables.has(t)
      ? `${this.API}/cars/${encodeURIComponent(t)}/${encodeURIComponent(sid)}`
      : `${this.API}/items/${encodeURIComponent(t)}/${encodeURIComponent(sid)}`;

    return this.http.get<{ item: any }>(url, { withCredentials: true });
  }




  getComputers(limit = 50) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/computers`,
      { params: { limit: String(limit) }, withCredentials: true }
    );
  }

  getHomeTheaters(limit = 2000) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/hometheaters`,
      { params: { limit: String(limit) }, withCredentials: true }
    );
  }

  getCars(limit = 50) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/cars`,
      { params: { limit: String(limit) }, withCredentials: true }
    );
  }

  getInstruments(limit = 2000) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/instruments`,
      { params: { limit: String(limit) }, withCredentials: true }
    );
  }
}
