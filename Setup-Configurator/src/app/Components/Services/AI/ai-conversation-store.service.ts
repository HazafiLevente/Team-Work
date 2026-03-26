import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';

export type AiConversationSender = 'me' | 'ai' | 'system' | 'product';

export interface AiConversationMessage {
  id: number;
  sender: AiConversationSender;
  text?: string;
  products?: any[];
  created_at: string;
  loading?: boolean;
}

export interface AiConversationRecord {
  key: string;
  title: string;
  lastText: string;
  updatedAt: string;
  messages: AiConversationMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class AiConversationStoreService {
  private readonly activeConversationPrefix = 'shared_ai_active_conversation_';
  private readonly userId$: Observable<string>;

  constructor(private http: HttpClient) {
    this.userId$ = this.http.get<any>('/api/auth/me', { withCredentials: true }).pipe(
      map((res) => String(res?.user?.id ?? 'guest')),
      catchError(() => of('guest')),
      shareReplay(1)
    );
  }

  getConversations(): Observable<AiConversationRecord[]> {
    return this.http.get<any[]>('/api/messages/ai/conversations', { withCredentials: true }).pipe(
      map((rows) => (rows || []).map((row) => this.normalizeConversation(row))),
      catchError(() => of([]))
    );
  }

  getConversation(key: string): Observable<AiConversationRecord | null> {
    return this.http.get<any>(`/api/messages/ai/conversation/${key}`, { withCredentials: true }).pipe(
      map((row) => {
        if (!row) return null;
        return this.normalizeConversation({
          key: row.key || key,
          title: row.title || 'Uj AI beszelgetes',
          lastText: '',
          updatedAt: row.updatedAt || new Date().toISOString(),
          messages: Array.isArray(row.items) ? row.items : []
        });
      }),
      catchError(() => of(null))
    );
  }

  createConversation(): Observable<AiConversationRecord> {
    return this.http.post<any>('/api/messages/ai/conversations', {}, { withCredentials: true }).pipe(
      map((row) => this.normalizeConversation(row))
    );
  }

  saveConversation(conversation: AiConversationRecord): Observable<AiConversationRecord[]> {
    return this.http.patch(
      `/api/messages/ai/conversation/${conversation.key}`,
      { title: conversation.title || 'Uj AI beszelgetes' },
      { withCredentials: true }
    ).pipe(
      switchMap(() => this.getConversations()),
      catchError(() => this.getConversations())
    );
  }

  deleteConversation(key: string): Observable<AiConversationRecord[]> {
    return this.http.delete(`/api/messages/ai/conversation/${key}`, { withCredentials: true }).pipe(
      switchMap(() => this.getConversations()),
      catchError(() => this.getConversations())
    );
  }

  getActiveConversationKey(): Observable<string | null> {
    return this.userId$.pipe(
      take(1),
      map((userId) => {
        const value = localStorage.getItem(this.activeConversationStorageKey(userId));
        return /^\d+$/.test(String(value || '')) ? String(value) : null;
      })
    );
  }

  setActiveConversationKey(key: string | null): Observable<string | null> {
    return this.userId$.pipe(
      take(1),
      map((userId) => {
        const storageKey = this.activeConversationStorageKey(userId);
        if (!key) {
          localStorage.removeItem(storageKey);
          return null;
        }

        const normalized = String(key);
        if (!/^\d+$/.test(normalized)) {
          localStorage.removeItem(storageKey);
          return null;
        }

        localStorage.setItem(storageKey, normalized);
        return normalized;
      })
    );
  }

  buildTitle(text: string): string {
    const clean = String(text || '').trim();
    if (!clean) return 'Uj AI beszelgetes';
    return clean.length > 34 ? `${clean.slice(0, 34)}...` : clean;
  }

  buildLastText(message: AiConversationMessage): string {
    if (message.sender === 'product' && Array.isArray(message.products)) {
      const count = message.products.length;
      return count === 1 ? '1 termek ajanlas' : `${count} termek ajanlas`;
    }

    return String(message.text || '').trim();
  }

  private normalizeConversation(row: any): AiConversationRecord {
    const messages = Array.isArray(row?.messages)
      ? row.messages
      : Array.isArray(row?.items)
        ? row.items
        : [];
    const normalizedMessages = messages
      .filter((message: any) => String(message?.sender || '').toLowerCase() !== 'product')
      .map((message: any, index: number) => ({
        id: Number(message?.id) || Date.now() + index,
        sender: message?.sender || 'ai',
        text: message?.text,
        products: Array.isArray(message?.products) ? message.products : undefined,
        created_at: String(message?.created_at || new Date().toISOString()),
        loading: !!message?.loading
      }));

    return {
      key: String(row?.key ?? row?.id ?? ''),
      title: String(row?.title || 'Uj AI beszelgetes'),
      lastText: String(row?.lastText || ''),
      updatedAt: String(row?.updatedAt || new Date().toISOString()),
      messages: normalizedMessages
    };
  }

  private activeConversationStorageKey(userId: string): string {
    return `${this.activeConversationPrefix}${userId}`;
  }
}
