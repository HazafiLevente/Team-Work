import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-bell-message',
  imports: [CommonModule],
  templateUrl: './bell-message.component.html',
  styleUrl: './bell-message.component.css'
})
export class BellMessageComponent implements OnInit {

  conversations: any[] = [];
  messages: any[] = [];
  activeKey: string = 'system';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadConversations();

    // ha url-ben változik a :key, kövessük
    this.route.paramMap.subscribe(p => {
      const k = p.get('key');
      if (k) this.openConversation(k);
    });
  }

  loadConversations() {
    this.http.get<any[]>('/api/bell/conversations', { withCredentials: true })
      .subscribe(res => {
        this.conversations = res || [];

        // fallback: ha nincs semmi, akkor is legyen system
        const first = this.conversations[0]?.key || 'system';

        const k = this.route.snapshot.paramMap.get('key');
        this.openConversation(k || first);
      });
  }

  openConversation(key: string) {
    this.activeKey = key;

    this.http.get<any[]>(`/api/bell/conversation/${key}`, { withCredentials: true })
      .subscribe(m => this.messages = m || []);
  }

  timeAgo(date: string): string {
    if (!date) return '';
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
  }
}
