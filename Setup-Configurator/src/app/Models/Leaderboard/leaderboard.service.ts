import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaderboardUser } from '../leaderboard-user.model';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private baseUrl = '/api/leaderboard';

  constructor(private http: HttpClient) {}

  getLeaderboard(): Observable<LeaderboardUser[]> {
    return this.http.get<LeaderboardUser[]>(this.baseUrl);
  }
}
