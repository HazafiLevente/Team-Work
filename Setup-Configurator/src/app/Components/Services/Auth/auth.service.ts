import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap, switchMap, catchError, of } from 'rxjs';

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
};

type MeResp = {
  loggedIn: boolean;
  user?: AuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Lekéri a jelenlegi session usert a backendtől és frissíti a user$-t.
   * Ezt hívjuk login után (és app initkor is lehet).
   */
  check(): Observable<AuthUser | null> {
    return this.http.get<MeResp>('/api/auth/me', { withCredentials: true }).pipe(
      map(r => (r.loggedIn ? (r.user ?? null) : null)),
      tap(u => this.userSubject.next(u)),
      catchError(() => {
        this.userSubject.next(null);
        return of(null);
      })
    );
  }
  register(payload: {
    fullname: string;
    username: string;
    email: string;
    password: string;
  }): Observable<AuthUser | null> {
    return this.http.post('/api/auth/register', payload, { withCredentials: true }).pipe(
      // 🔥 regisztráció után azonnal kérjük le az aktuális usert
      switchMap(() => this.check())
    );
  }

  /**
   * Login: cookie beáll -> utána azonnal check() -> user$ frissül, nincs F5.
   */
  login(payload: { email: string; password: string; rememberMe: boolean }): Observable<AuthUser | null> {
    return this.http.post('/api/auth/login', payload, { withCredentials: true }).pipe(
      switchMap(() => this.check())
    );
  }

  /**
   * Logout: cookie törlés -> user$ null
   */
  logout(): Observable<any> {
    return this.http.post('/api/auth/logout', {}, { withCredentials: true }).pipe(
      tap(() => this.userSubject.next(null))
    );
  }
  verifyRegisterCode(data: {
    fullname: string;
    username: string;
    email: string;
    password: string;
    code: string;
  }) {
    return this.http.post(
      '/api/auth/register/verify',
      data,
      { withCredentials: true }
    ).pipe(
      switchMap(() => this.check()) // 🔥 login után user frissül
    );
  }

  requestRegisterCode(data: {
    fullname: string;
    username: string;
    email: string;
    password: string;
  }) {
    return this.http.post(
      '/api/auth/register/request',
      data
    );
  }




}
