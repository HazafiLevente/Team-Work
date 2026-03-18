import { Component, HostListener, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-messages',
  imports: [CommonModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessagesComponent implements OnInit, OnDestroy {

  users: any[] = [];
  conversations: any[] = [];
  messages: any[] = [];
  newMessage = '';

  openMenuId: number | null = null;
  editingMessageId: number | null = null;
  editText = '';

  showNewChat = false;
  activeKey: string | null = null;
  authUserId: number | null = null;

  @ViewChild('bottom') bottom!: ElementRef<HTMLDivElement>;

  isMobile = false;
  mobileView: 'list' | 'chat' = 'list';

  contextMenuOpen = false;
  contextMenuX = 0;
  contextMenuY = 0;

  contextTarget: { type: 'conversation' | 'message', data: any } | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    document.body.setAttribute('data-page', 'messages');

    this.onResize();
    this.loadAuth();
    this.loadConversations();

    this.route.paramMap.subscribe(p => {
      const key = p.get('key');

      if (key) {
        this.activeKey = key;
        this.openConversation(key);
      } else {
        if (this.isMobile) this.mobileView = 'list';
      }
    });
  }

  ngOnDestroy(): void {
    document.body.removeAttribute('data-page');
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 820;

    if (!this.isMobile) {
      this.mobileView = 'chat';
      return;
    }

    if (this.isMobile && !this.activeKey) {
      this.mobileView = 'list';
    }
  }

  goBackToList() {
    this.mobileView = 'list';
    this.activeKey = null;
    this.messages = [];
    this.router.navigate(['/user/messages']);
  }

  getActiveTitle(): string {
    const c = this.conversations.find(x => String(x.key) === String(this.activeKey));
    return c?.title || 'Chat';
  }

  @HostListener('document:click')
  onDocClick() {
    this.openMenuId = null;
    this.closeContextMenu();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeContextMenu();
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocRightClick(event: MouseEvent) {
    const el = event.target as HTMLElement;
    if (el?.closest?.('.ctx-menu')) return;

    if (this.contextMenuOpen) {
      event.preventDefault();
      this.closeContextMenu();
    }
  }

  onRightClickConversation(event: MouseEvent, conv: any) {
    event.preventDefault();
    event.stopPropagation();

    this.contextTarget = { type: 'conversation', data: conv };
    this.openContextMenu(event.clientX, event.clientY);
  }

  onRightClickMessage(event: MouseEvent, msg: any) {
    event.preventDefault();
    event.stopPropagation();

    this.contextTarget = { type: 'message', data: msg };
    this.openContextMenu(event.clientX, event.clientY);
  }

  openContextMenu(x: number, y: number) {
    const menuW = 220;
    const menuH = 240;
    const pad = 10;

    const maxX = window.innerWidth - menuW - pad;
    const maxY = window.innerHeight - menuH - pad;

    this.contextMenuX = Math.max(pad, Math.min(x, maxX));
    this.contextMenuY = Math.max(pad, Math.min(y, maxY));

    this.contextMenuOpen = true;
  }

  closeContextMenu() {
    this.contextMenuOpen = false;
    this.contextTarget = null;
  }

  ctxDetails() {
    const t = this.contextTarget;
    if (!t) return;
    console.log('Részletek:', t);
    this.closeContextMenu();
  }

  ctxDelete() {
    const t = this.contextTarget;
    if (!t) return;

    if (t.type === 'message') {
      this.deleteMessage(t.data.id);
      this.closeContextMenu();
      return;
    }

    const key = t.data?.key;
    if (!key) {
      this.closeContextMenu();
      return;
    }

    if (!confirm('Biztos törlöd ezt a beszélgetést?')) {
      this.closeContextMenu();
      return;
    }

    this.http.delete(`/api/messages/conversation/${key}`, { withCredentials: true })
      .subscribe({
        next: () => {
          if (String(this.activeKey) === String(key)) {
            this.goBackToList();
          }
          this.loadConversations();
          this.closeContextMenu();
        },
        error: (err) => {
          console.error('Conversation delete failed:', err);
          this.closeContextMenu();
        }
      });
  }

  ctxMute() {
    console.log('Lenémítás (TODO)');
    this.closeContextMenu();
  }

  ctxDisable() {
    console.log('Tiltás (TODO)');
    this.closeContextMenu();
  }

  ctxBlock() {
    console.log('Blokkolás (TODO)');
    this.closeContextMenu();
  }

  toggleMenu(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  scrollToBottom(smooth = true) {
    if (!this.bottom) return;
    this.bottom.nativeElement.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  }

  startEdit(message: any) {
    this.editingMessageId = message.id;
    this.editText = message.context;
    this.openMenuId = null;
  }

  cancelEdit() {
    this.editingMessageId = null;
    this.editText = '';
  }

  saveEdit() {
    if (!this.editText.trim() || !this.editingMessageId) return;

    this.http.patch(`/api/messages/${this.editingMessageId}`, {
      context: this.editText
    }, { withCredentials: true })
      .subscribe(() => {
        this.editingMessageId = null;
        this.editText = '';
        if (this.activeKey) this.openConversation(this.activeKey);
        this.loadConversations();
      });
  }

  deleteMessage(id: number) {
    this.openMenuId = null;

    if (!confirm('Biztos törlöd az üzenetet?')) return;

    this.http.delete(`/api/messages/${id}`, { withCredentials: true })
      .subscribe(() => {
        if (this.activeKey) this.openConversation(this.activeKey);
        this.loadConversations();
      });
  }

  goToConversation(key: string) {
    this.router.navigate(['/user/messages', key]);
    if (this.isMobile) this.mobileView = 'chat';
  }

  loadAuth() {
    this.http.get<any>('/api/auth/me', { withCredentials: true })
      .subscribe(res => {
        this.authUserId = res?.user?.id ?? null;
      });
  }

  loadConversations() {
    this.http.get<any[]>('/api/messages/conversations', { withCredentials: true })
      .subscribe(res => {
        this.conversations = res || [];
      });
  }

  loadUsers() {
    this.http.get<any[]>('/api/users', { withCredentials: true })
      .subscribe(res => {
        const allUsers = res || [];

        const existingUserIds = (this.conversations || [])
          .map(c => c?.otherUserId)
          .filter((x: any) => typeof x === 'number');

        this.users = allUsers.filter(u =>
          u.id !== this.authUserId &&
          !existingUserIds.includes(u.id)
        );
      });
  }

  openConversation(key: string) {
    this.activeKey = key;

    this.http
      .get<any>(`/api/messages/conversation/${key}`, { withCredentials: true })
      .subscribe(res => {
        this.messages = res?.items || [];
        setTimeout(() => this.scrollToBottom(false), 0);

        if (this.isMobile) this.mobileView = 'chat';
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
        this.router.navigate(['/user/messages', panelId]);
        this.loadConversations();

        if (this.isMobile) this.mobileView = 'chat';
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
      .subscribe({
        next: () => {
          this.newMessage = '';
          this.openConversation(this.activeKey!);
          this.loadConversations();
        },
        error: () => {
          alert('Hiba üzenetküldésnél.');
        }
      });
  }

  getOtherUserId(): number | null {
    const panel = this.conversations.find(c => String(c.key) === String(this.activeKey));
    if (!panel) return null;
    return panel.otherUserId ?? null;
  }

  timeAgo(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }
}
