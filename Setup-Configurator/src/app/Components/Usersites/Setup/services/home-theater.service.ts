import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class HomeTheaterService {
  private baseUrl = '/api/home-theater';

  constructor(private http: HttpClient) {}



  getCatalog(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalog`, { withCredentials: true });
  }



  getBuildsForSetup(setupId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/setup/${setupId}`, { withCredentials: true });
  }



  getBuildById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/build/${id}`, { withCredentials: true });
  }



  saveBuild(build: any): Observable<any> {


    return this.http.post<any>(`${this.baseUrl}/build`, build, { withCredentials: true });
  }



  deleteBuild(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/build/${id}`, { withCredentials: true });
  }
}
