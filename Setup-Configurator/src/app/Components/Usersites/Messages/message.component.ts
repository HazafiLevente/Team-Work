import {Component, HostListener, OnInit} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-bell-message',
  imports: [CommonModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrl: './message.component.css'
})

export class BellMessageComponent implements OnInit {

  users: any[] = [];
  conversations: any[] = [];
  messages: any[] = [];
  newMessage: string = '';

  openMenuId: number | null = null;
  editingMessageId: number | null = null;
  editText: string = '';

  toggleMenu(id: number, event: MouseEvent) {
    event.stopPropagation();

    if (this.openMenuId === id) {
      this.openMenuId = null;
    } else {
      this.openMenuId = id;
    }
  }

  @HostListener('document:click')
  closeAllMenus() {
    this.openMenuId = null;
  }


  showNewChat = false;
  activeKey: string | null = null;
  authUserId: number | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAuth();
    this.loadConversations();

    // 🔥 route figyelés
    this.route.paramMap.subscribe(p => {
      const key = p.get('key');
      if (key) {
        this.activeKey = key;
        this.openConversation(key);
      }
    });
  }

  startEdit(message: any) {
    this.editingMessageId = message.id;
    this.editText = message.context;
    this.openMenuId = null;
  }



  saveEdit() {

    if (!this.editText.trim() || !this.editingMessageId) return;

    this.http.patch(`/api/messages/${this.editingMessageId}`, {
      context: this.editText
    }, { withCredentials: true })
      .subscribe(() => {

        this.editingMessageId = null;
        this.editText = '';
        this.openConversation(this.activeKey!);
      });
  }

  deleteMessage(id: number) {

    this.openMenuId = null;

    if (!confirm("Biztos törlöd az üzenetet?")) return;

    this.http.delete(`/api/messages/${id}`, { withCredentials: true })
      .subscribe(() => {
        this.openConversation(this.activeKey!);
      });
  }


  cancelEdit() {
    this.editingMessageId = null;
    this.editText = '';
  }





  goToConversation(key: string) {
    this.router.navigate(['/user/message', key]);
  }

  loadAuth() {
    this.http.get<any>('/api/auth/me', { withCredentials: true })
      .subscribe(res => {
        this.authUserId = res?.user?.id;
      });
  }

  loadUsers() {
    this.http.get<any[]>('/api/users', { withCredentials: true })
      .subscribe(res => {

        const allUsers = res || [];

        const existingUserIds = this.conversations.map(c => c.otherUserId);

        this.users = allUsers.filter(u =>
          u.id !== this.authUserId &&
          !existingUserIds.includes(u.id)
        );
      });
  }

  loadConversations() {
    this.http.get<any[]>('/api/messages/conversations', { withCredentials: true })
      .subscribe(res => {
        this.conversations = res || [];
      });
  }

  openConversation(key: string) {

    this.activeKey = key;

    this.http
      .get<any>(`/api/messages/conversation/${key}`, { withCredentials: true })
      .subscribe(res => {
        this.messages = res?.items || [];
      });
  }

  toggleNewChat() {
    this.showNewChat = !this.showNewChat;
    if (this.showNewChat) this.loadUsers();
  }

  startConversation(user: any) {

    this.http.post<any>('/api/messages/start', {
      user2_id: user.id
    }, { withCredentials: true })
      .subscribe(res => {

        const panelId = String(res.panelId);

        this.showNewChat = false;

        // 🔥 navigáljunk route-ra
        this.router.navigate(['/user/message', panelId]);

        this.loadConversations();
      });
  }

  sendMessage() {

    if (!this.newMessage.trim() || !this.activeKey) return;

    const otherId = this.getOtherUserId();
    if (!otherId) return;

    this.http.post('/api/messages/send', {
      user2_id: otherId,
      context: this.newMessage
    }, { withCredentials: true })
      .subscribe(() => {

        this.newMessage = '';

        this.openConversation(this.activeKey!);
      });
  }

  getOtherUserId(): number | null {

    const panel = this.conversations.find(c => c.key === this.activeKey);

    if (!panel) return null;

    return panel.otherUserId;
  }

  timeAgo(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }
}
