import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = '/api/auth';

  private userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  check() {
    this.http.get<any>(`${this.base}/me`, { withCredentials: true })
      .subscribe({
        next: res => {
          if (res?.user) {
            this.userSubject.next(res.user);
          }
        },
        error: err => {
          // ❗ NE nullázd ki azonnal
          console.warn('auth check failed (ignored):', err.status);
        }
      });
  }


  login(data: any) {
    return this.http.post(`${this.base}/login`, data, {
      withCredentials: true
    });
  }

  register(data: any) {
    return this.http.post(`${this.base}/register`, data, {
      withCredentials: true
    });
  }

  logout() {
    return this.http.post(`${this.base}/logout`, {}, {
      withCredentials: true
    }).subscribe(() => {
      this.userSubject.next(null); // ✔️ ILYENKOR SZABAD
    });
  }

}
