import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  constructor(private http: HttpClient) {}

  ask(message: string, history: any[] = [], panelId?: string | number | null) {
    return this.http.post<any>(
      '/api/ai/ask',
      { message, history, panel_id: panelId ?? null },
      { withCredentials: true }
    );
  }
}
