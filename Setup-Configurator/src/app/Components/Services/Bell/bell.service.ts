import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface BellItem {
  source_table: string;                 // ✅ kell
  id: number;
  title: string | null;
  message: string | null;
  created_at: string;
  read: boolean;
  type: 'system' | 'news' | 'register' | 'report' | 'messages';

  conversation_key: string;
  conversation_title: string;
}

@Injectable({ providedIn: 'root' })
export class BellService {

  private _open = new BehaviorSubject(false);
  open$ = this._open.asObservable();

  private _items = new BehaviorSubject<BellItem[]>([]);
  items$ = this._items.asObservable();

  constructor(private http: HttpClient) {
  }

  toggle() {
    const next = !this._open.value;
    this._open.next(next);

    if (next) this.load();
  }

  close() {
    this._open.next(false);
  }

  load() {
    this.http
      .get<BellItem[]>('/api/bell', {withCredentials: true})
      .subscribe(data => this._items.next(data || []));
  }

  // ✅ ÚJ: object param
  markRead(item: { source_table: string; id: number } | null | undefined) {
    if (!item?.source_table || !item?.id) return;

    this.http.post(
      '/api/bell/read',
      {source_table: item.source_table, message_id: item.id},
      {withCredentials: true}
    ).subscribe(() => {
      this._items.next(
        this._items.value.map(n =>
          (n.source_table === item.source_table && n.id === item.id)
            ? {...n, read: true}
            : n
        )
      );
    });
  }
}
