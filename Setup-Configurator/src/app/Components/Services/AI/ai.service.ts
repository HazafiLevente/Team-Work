import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface AiResponse {
  answer: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {

  private base = '/api/ai';

  constructor(private http: HttpClient) {}

  ask(message: string, history: any[] = []) {
    return this.http.post<any>(
      '/api/ai/ask',
      { message, history },
      { withCredentials: true }   // 🔥 EZ KELL
    );
  }

}
