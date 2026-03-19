import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * HomeTheaterService
 * Encapsulates all API logic for Home Theater catalog and builds.
 */
@Injectable({
  providedIn: 'root'
})
export class HomeTheaterService {
  private baseUrl = '/api/home-theater';

  constructor(private http: HttpClient) {}

  /**
   * Fetches the entire HT gear catalog (receivers, speakers, etc.)
   */
  getCatalog(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalog`, { withCredentials: true });
  }

  /**
   * Fetches all HT builds for a specific setup
   */
  getBuildsForSetup(setupId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/setup/${setupId}`, { withCredentials: true });
  }

  /**
   * Fetches a single build by its unique ID
   */
  getBuildById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/build/${id}`, { withCredentials: true });
  }

  /**
   * Saves a new or existing build
   */
  saveBuild(build: any): Observable<any> {
    // If ID exists, we could use PUT, but current backend uses POST for both
    // I'll keep it as POST /build for now or refactor backend to be RESTful
    return this.http.post<any>(`${this.baseUrl}/build`, build, { withCredentials: true });
  }

  /**
   * Removes a build
   */
  deleteBuild(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/build/${id}`, { withCredentials: true });
  }
}
