import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface BellItem {
  id: number;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class BellService {

  private _open = new BehaviorSubject(false);
  open$ = this._open.asObservable();

  private _items = new BehaviorSubject<BellItem[]>([]);
  items$ = this._items.asObservable();

  constructor(private http: HttpClient) {}

  toggle() {
    const next = !this._open.value;
    this._open.next(next);

    if (next) {
      this.load();
    }
  }

  close() {
    this._open.next(false);
  }

  load() {
    this.http
      .get<BellItem[]>('/api/bell', { withCredentials: true })
      .subscribe(data => this._items.next(data));
  }

  markRead(id: number) {
    this.http.post(
      '/api/bell/read',
      { messageId: id },
      { withCredentials: true }
    ).subscribe(() => {
      this._items.next(
        this._items.value.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
      );
    });
  }
}
