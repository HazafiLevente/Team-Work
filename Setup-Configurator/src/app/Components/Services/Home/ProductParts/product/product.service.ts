import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

  getProductDetails(table: string, id: string) {
    return this.http.get<{ item: any }>(
      `${this.API}/items/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
      { withCredentials: true }
    );
  }

  getComputers(limit = 50) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/computers`,
      { params: { limit: String(limit) }, withCredentials: true }
    );
  }

  getHomeTheaters(limit = 2000) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/home-theater`,
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
