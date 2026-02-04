import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProducts(limit = 20): Observable<{ items: any[] }> {
    const params = new HttpParams().set('limit', String(limit));

    return this.http.get<{ items: any[] }>(
      `${this.API}/products`,
      { params, withCredentials: true }
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
      {
        params: { limit },
        withCredentials: true
      }
    );
  }

  // ✅ FIX: baseUrl helyett API + withCredentials + params egységesen
  getHomeTheaters(limit = 2000) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/hometheaters`,
      {
        params: { limit },
        withCredentials: true
      }
    );
  }

  // ✅ FIX: itt is egységesen API-t használjunk (nálad eddig "/api/cars" volt)
  getCars(limit = 50) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/cars`,
      {
        params: { limit },
        withCredentials: true
      }
    );
  }
}
