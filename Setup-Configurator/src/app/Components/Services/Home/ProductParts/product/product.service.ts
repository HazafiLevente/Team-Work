import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProducts(limit = 20): Observable<{ items: any[] }> {
    // ha a backend nem kezel limitet, akkor vedd ki
    const params = new HttpParams().set('limit', String(limit));

    return this.http.get<{ items: any[] }>(
      `${this.API}/products`,
      { params, withCredentials: true }
    );
  }
}


