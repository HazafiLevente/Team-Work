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

  private initializedSubject = new BehaviorSubject<boolean>(false);
  initialized$ = this.initializedSubject.asObservable();

  constructor(private http: HttpClient) { }



  check(): Observable<AuthUser | null> {
    return this.http.get<MeResp>('/api/auth/me', { withCredentials: true }).pipe(
      map(r => (r.loggedIn ? (r.user ?? null) : null)),
      tap(u => {
        this.userSubject.next(u);
        this.initializedSubject.next(true);
      }),
      catchError(() => {
        this.userSubject.next(null);
        this.initializedSubject.next(true);
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

      switchMap(() => this.check())
    );
  }



  login(payload: { email: string; password: string; rememberMe: boolean }): Observable<AuthUser | null> {
    return this.http.post('/api/auth/login', payload, { withCredentials: true }).pipe(
      switchMap(() => this.check())
    );
  }



  logout(): Observable<any> {
    return this.http.post('/api/auth/logout', {}, { withCredentials: true }).pipe(
      tap(() => {
        this.userSubject.next(null);
        this.initializedSubject.next(true);
      })
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
      switchMap(() => this.check())
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
  requestPasswordReset(email: string) {
    return this.http.post('/api/auth/password/request', { email });
  }

  resetPassword(email: string, code: string, newPassword: string) {
    return this.http.post('/api/auth/password/reset', { email, code, newPassword });
  }


  googleLogin(idToken: string) {
    return this.http.post(
      '/api/auth/google',
      { idToken },
      { withCredentials: true }
    ).pipe(
      switchMap(() => this.check())
    );
  }
}
