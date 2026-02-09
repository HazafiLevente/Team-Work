import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RankMeDto = {
  level: number;
  points: number;
  current: { min: number; max: number };
  progress: number; // 0..1
  next: { level: number; pointsNeeded: number };
};

@Injectable({ providedIn: 'root' })
export class RankService {
  constructor(private http: HttpClient) {}

  me(): Observable<RankMeDto> {
    return this.http.get<RankMeDto>('/api/ranks/me', { withCredentials: true });
  }

}
