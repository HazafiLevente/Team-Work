import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../../../../../Models/Product/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private baseUrl = '/api/products'; // server.js

  constructor(private http: HttpClient) {}

  getProducts(limit: number): Observable<{ items: Product[] }> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<{ items: Product[] }>(this.baseUrl, { params });
  }
}
