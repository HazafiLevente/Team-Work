import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  // A backend szerver alap címe
  private readonly API = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Általános terméklista lekérése
   */
  getProducts(limit = 20): Observable<{ items: any[] }> {
    const params = new HttpParams().set('limit', String(limit));

    return this.http.get<{ items: any[] }>(
      `${this.API}/products`,
      { params, withCredentials: true }
    );
  }

  /**
   * Egy konkrét termék részletes adatai táblanév és ID alapján
   */
  getProductDetails(table: string, id: string) {
    return this.http.get<{ item: any }>(
      `${this.API}/items/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
      { withCredentials: true }
    );
  }

  /**
   * Számítógépek lekérése
   */
  getComputers(limit = 50) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/computers`,
      {
        params: { limit: String(limit) },
        withCredentials: true
      }
    );
  }

  /**
   * Házimozi rendszerek lekérése
   */
  getHomeTheaters(limit = 2000) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/hometheaters`,
      {
        params: { limit: String(limit) },
        withCredentials: true
      }
    );
  }

  /**
   * Autók lekérése
   */
  getCars(limit = 50) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/cars`,
      {
        params: { limit: String(limit) },
        withCredentials: true
      }
    );
  }

  /**
   * ✅ ÚJ: Hangszerek és kiegészítők lekérése
   * Ez a metódus hívja meg a Node.js backend új /api/instruments végpontját,
   * ami a Supabase instrument_items_view nézetéből dolgozik.
   */
  getInstruments(limit = 2000) {
    return this.http.get<{ items: any[] }>(
      `${this.API}/instruments`,
      {
        params: { limit: String(limit) },
        withCredentials: true
      }
    );
  }

}
