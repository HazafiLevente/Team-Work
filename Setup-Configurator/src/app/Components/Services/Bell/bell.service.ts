import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export type BellItem = {
  source_table: string;
  id: number;
  type: string;
  category?: string;
  title: string;
  message: string;
  created_at: string;

  conversation_key?: string;
  conversation_title?: string;

  sender_id?: number | null;
  receiver_id?: number | null;
  sender_name?: string | null;
  receiver_name?: string | null;

  read?: boolean;
};

@Injectable({ providedIn: 'root' })
export class BellService {
  private openSub = new BehaviorSubject<boolean>(false);
  open$: Observable<boolean> = this.openSub.asObservable();

  private itemsSub = new BehaviorSubject<BellItem[]>([]);
  items$: Observable<BellItem[]> = this.itemsSub.asObservable();

  constructor(private http: HttpClient) {

    this.refresh();
  }

  toggle() {
    const next = !this.openSub.value;
    this.openSub.next(next);


    if (next) this.refresh();
  }

  close() {
    this.openSub.next(false);
  }

  refresh() {
    this.http.get<any>('/api/bell', { withCredentials: true }).subscribe({
      next: (res) => {
        const arr =
          Array.isArray(res) ? res :
            Array.isArray(res?.items) ? res.items :
              Array.isArray(res?.from_view) ? res.from_view :
                [];

        this.itemsSub.next(arr);
        console.log("🔔 bell refresh got:", res);
        console.log("🔔 bell items array:", arr);
      },
      error: (err) => {
        console.log("🔔 bell refresh error:", err);
        this.itemsSub.next([]);
      }
    });
  }


  markReadSystem(system_id: number) {
    this.http.post('/api/bell/read', { system_id }, { withCredentials: true }).subscribe({
      next: () => this.refresh(),
      error: () => {}
    });
  }
}
