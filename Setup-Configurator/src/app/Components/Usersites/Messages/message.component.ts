import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AiService } from '../../Services/AI/ai.service';
import { AuthService } from '../../Services/Auth/auth.service';
import { ProductService } from '../../Services/Home/ProductParts/product/product.service';
import {
  AiConversationMessage,
  AiConversationRecord,
  AiConversationStoreService
} from '../../Services/AI/ai-conversation-store.service';

type ChatMode = 'messages' | 'ai';

@Component({
  standalone: true,
  selector: 'app-messages',
  imports: [CommonModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessagesComponent implements OnInit, OnDestroy {
  private readonly aiTypeToTable: Record<string, string> = {
    cpu_desktop: 'processors',
    gpu: 'video_cards',
    motherboard: 'motherboard',
    ram: 'ram',
    psu: 'psu',
    cpu_cooler: 'cpu_coolers',
    soundcard: 'soundcards',
    receiver: 'home_theater',
    audio_processor: 'audio_processors',
    portable_speaker: 'portable_speakers',
    front_speaker: 'front_speaker',
    back_speaker: 'back_speaker',
    side_speaker: 'side_speaker',
    center_speaker: 'center_speakers',
    floor_speaker: 'floor_speakers',
    ceiling_speaker: 'ceiling_speakers',
    subwoofer: 'subwoofer',
    bass_amplifier: 'bass_amplifier',
    bass_shaker: 'bass_shaker',
    studio_monitor: 'studio_monitor_speakers',
    acoustic_drums: 'acoustic_drums',
    acoustic_guitar: 'acoustic_guitars',
    trumpet: 'c_trumpets',
    saxophone: 'alt_saxophone',
    network_switch: 'switches',
    server_desktop: 'storages',
    soundbar: 'home_theater'
  };

  users: any[] = [];
  conversations: any[] = [];
  messages: any[] = [];
  newMessage = '';

  aiConversations: AiConversationRecord[] = [];
  aiMessages: AiConversationMessage[] = [];
  activeAiKey: string | null = null;

  mode: ChatMode = 'messages';
  messagesAiEnabled = false;

  openMenuId: number | null = null;
  editingMessageId: number | null = null;
  editText = '';

  showNewChat = false;
  activeKey: string | null = null;
  authUserId: number | null = null;

  @ViewChild('bottom') bottom!: ElementRef<HTMLDivElement>;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  isMobile = false;
  mobileView: 'list' | 'chat' = 'list';

  private nowMs = Date.now();
  private nowTimer: ReturnType<typeof setInterval> | null = null;

  selectedAiResponseMessageId: number | null = null;
  selectedAiResponseProducts: any[] = [];
  selectedAiProduct: any = null;
  selectedAiProductDetails: any = null;
  selectedAiProductKeys: string[] = [];
  selectedAiProductLoading = false;
  selectedAiProductError: string | null = null;

  contextMenuOpen = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextTarget: { type: 'conversation' | 'message' | 'aiConversation', data: any } | null = null;

  conversationMenuKey: string | null = null;
  messageMenuId: number | null = null;
  reportTarget: any = null;
  reportScope: 'profile' | 'message' = 'profile';
  reportTitle = '';
  reportType = 'spam';
  reportMessage = '';
  reportSending = false;
  reportError = '';
  reportTypes = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Zaklatás' },
    { value: 'hate', label: 'Gyűlöletkeltés' },
    { value: 'scam', label: 'Átverés' },
    { value: 'other', label: 'Egyéb' }
  ];
  profileTarget: any = null;
  profileLoading = false;
  profileError = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private ai: AiService,
    private aiStore: AiConversationStoreService,
    private productService: ProductService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const savedMode = localStorage.getItem('messagesMode');
    const savedAiEnabled = localStorage.getItem('messagesAiEnabled');

    this.mode = savedMode === 'ai' ? 'ai' : 'messages';
    this.messagesAiEnabled = savedAiEnabled === 'true';

    if (this.messagesAiEnabled) {
      this.mode = 'ai';
    }

    this.onResize();
    this.loadAuth();
    this.loadConversations();

    this.route.paramMap.subscribe((params) => {
      const key = params.get('key');

      if (this.mode === 'messages' && key) {
        this.activeKey = key;
        this.openConversation(key);
      } else if (this.isMobile) {
        this.mobileView = this.activeSelectionKey ? 'chat' : 'list';
      }
    });

    this.nowTimer = setInterval(() => {
      this.nowMs = Date.now();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.nowTimer) clearInterval(this.nowTimer);
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 820;
    this.mobileView = !this.isMobile ? 'chat' : (this.activeSelectionKey ? 'chat' : 'list');
  }

  @HostListener('document:click')
  onDocClick() {
    this.openMenuId = null;
    this.conversationMenuKey = null;
    this.messageMenuId = null;
    this.closeContextMenu();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeContextMenu();
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocRightClick(event: MouseEvent) {
    const element = event.target as HTMLElement;
    if (element?.closest?.('.ctx-menu')) return;

    if (this.contextMenuOpen) {
      event.preventDefault();
      this.closeContextMenu();
    }
  }

  get activeSelectionKey(): string | null {
    return this.mode === 'ai' ? (this.activeAiKey || '__ai_draft__') : this.activeKey;
  }

  get displayedMessages(): any[] {
    return this.mode === 'ai' ? this.aiMessages : this.messages;
  }

  isOwnMessage(message: any): boolean {
    if (message?.sender === 'me') return true;
    return Number(message?.user_id) === Number(this.authUserId);
  }

  getActiveTitle(): string {
    if (this.mode === 'ai') {
      return this.aiConversations.find((c) => c.key === this.activeAiKey)?.title || 'AI beszélgetés';
    }

    return this.conversations.find((c) => String(c.key) === String(this.activeKey))?.title || 'Chat';
  }

  contextIsOwnMessage(): boolean {
    return this.contextTarget?.type === 'message' && this.isOwnMessage(this.contextTarget.data);
  }

  contextIsOtherMessage(): boolean {
    return this.contextTarget?.type === 'message' && !this.isOwnMessage(this.contextTarget.data);
  }

  onToggleMode(checked: boolean) {
    this.messagesAiEnabled = checked;
    localStorage.setItem('messagesAiEnabled', String(checked));
    this.setMode(checked ? 'ai' : 'messages');
  }

  setMode(mode: ChatMode) {
    if (this.mode === mode) {
      if (this.isMobile) {
        this.mobileView = this.activeSelectionKey ? 'chat' : 'list';
      }
      return;
    }

    this.mode = mode;
    this.showNewChat = false;
    localStorage.setItem('messagesMode', mode);

    if (mode === 'ai') {
      this.loadAiConversations(() => {
        if (!this.activeAiKey) {
          if (this.aiConversations.length) {
            this.openAiConversation(this.aiConversations[0].key);
          } else {
            this.aiMessages = [this.buildSystemMessage()];
          }
        }
      });
    } else {
      if (this.activeKey) {
        this.openConversation(this.activeKey);
      }

      if (this.isMobile) {
        this.mobileView = this.activeKey ? 'chat' : 'list';
      }
    }
  }

  goBackToList() {
    this.mobileView = 'list';

    if (this.mode === 'ai') {
      this.activeAiKey = null;
      this.aiMessages = [];
      this.aiStore.setActiveConversationKey(null).subscribe();
      return;
    }

    this.activeKey = null;
    this.messages = [];
    this.router.navigate(['/user/messages']);
  }

  onRightClickConversation(event: MouseEvent, conversation: any) {
    event.preventDefault();
    event.stopPropagation();
    this.contextTarget = { type: 'conversation', data: conversation };
    this.openContextMenu(event.clientX, event.clientY);
  }

  toggleConversationMenu(event: MouseEvent, conversation: any) {
    event.preventDefault();
    event.stopPropagation();
    this.conversationMenuKey =
      this.conversationMenuKey === String(conversation.key) ? null : String(conversation.key);
  }

  openReportModal(event: MouseEvent, conversation: any) {
    event.preventDefault();
    event.stopPropagation();
    this.conversationMenuKey = null;
    this.prepareProfileReport(conversation);
  }

  private prepareProfileReport(conversation: any) {
    this.reportScope = 'profile';
    this.reportTarget = conversation;
    this.reportTitle = `Report: ${conversation.title || 'Felhasználó'}`;
    this.reportType = 'spam';
    this.reportMessage = '';
    this.reportError = '';
    this.reportSending = false;
  }

  openMessageReportModal(event: MouseEvent, message: any) {
    event.preventDefault();
    event.stopPropagation();
    if (this.mode !== 'messages' || this.isOwnMessage(message)) return;

    this.messageMenuId = null;
    this.prepareMessageReport(message);
  }

  private prepareMessageReport(message: any) {
    this.reportScope = 'message';
    this.reportTarget = message;
    this.reportTitle = 'Report message';
    this.reportType = 'spam';
    this.reportMessage = '';
    this.reportError = '';
    this.reportSending = false;
  }

  closeReportModal() {
    if (this.reportSending) return;
    this.reportTarget = null;
    this.reportError = '';
  }

  openConversationProfile(event: MouseEvent, conversation: any) {
    event.preventDefault();
    event.stopPropagation();
    this.conversationMenuKey = null;
    this.openProfileForTarget(conversation);
  }

  openMessageProfile(event: MouseEvent, message: any) {
    event.preventDefault();
    event.stopPropagation();
    if (this.mode !== 'messages' || this.isOwnMessage(message)) return;

    this.messageMenuId = null;
    this.openProfileForTarget(message);
  }

  ctxOpenProfile() {
    const target = this.contextTarget;
    if (!target || (target.type !== 'conversation' && target.type !== 'message')) return;

    const data = target.data;
    this.closeContextMenu();
    this.openProfileForTarget(data);
  }

  closeProfileModal() {
    this.profileTarget = null;
    this.profileLoading = false;
    this.profileError = '';
  }

  profileInitial(): string {
    const name = this.profileTarget?.user?.name || this.profileTarget?.user?.username || '?';
    return String(name).charAt(0).toUpperCase();
  }

  openDetailedProfile() {
    const profileName = this.profileTarget?.user?.name || this.profileTarget?.user?.username;
    if (!profileName) return;

    this.closeProfileModal();
    const urlName = this.auth.formatNameForUrl(profileName);
    this.router.navigate(['/user/profile', urlName]);
  }

  private openProfileForTarget(target: any) {
    const userId = this.getProfileUserId(target);
    if (!userId) {
      this.profileTarget = null;
      this.profileError = 'Nem található a felhasználó.';
      return;
    }

    this.profileTarget = null;
    this.profileLoading = true;
    this.profileError = '';

    this.http.get<any>(`/api/users/${userId}/profile`, { withCredentials: true }).subscribe({
      next: (profile) => {
        this.profileTarget = {
          user: profile?.user || {},
          mySetups: Array.isArray(profile?.mySetups) ? profile.mySetups : []
        };
        this.profileLoading = false;
      },
      error: (err) => {
        this.profileLoading = false;
        this.profileError = err.error?.error || 'Nem sikerült betölteni a profilt.';
      }
    });
  }

  private getProfileUserId(target: any): number | null {
    const id = Number(target?.otherUserId ?? target?.user_id);
    if (!Number.isFinite(id) || id <= 0 || id === Number(this.authUserId)) return null;
    return id;
  }

  submitReport() {
    if (!this.reportTarget || this.reportSending) return;

    const title = this.reportTitle.trim();
    const message = this.reportMessage.trim();

    if (!title || !this.reportType || !message) {
      this.reportError = 'Tölts ki minden mezőt.';
      return;
    }

    this.reportSending = true;
    this.reportError = '';

    this.http.post(
      '/api/messages/report',
      {
        panel_id: this.reportScope === 'profile' ? this.reportTarget.key : this.activeKey,
        reported_user_id: this.reportScope === 'profile' ? this.reportTarget.otherUserId : this.reportTarget.user_id,
        message_id: this.reportScope === 'message' ? this.reportTarget.id : undefined,
        report_scope: this.reportScope,
        title,
        report_type: this.reportType,
        message
      },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.reportSending = false;
        this.reportTarget = null;
        alert('Report elküldve az adminoknak.');
      },
      error: (err) => {
        this.reportSending = false;
        this.reportError = err.error?.error || 'Nem sikerült elküldeni a reportot.';
      }
    });
  }

  onRightClickAiConversation(event: MouseEvent, conversation: AiConversationRecord) {
    event.preventDefault();
    event.stopPropagation();
    this.contextTarget = { type: 'aiConversation', data: conversation };
    this.openContextMenu(event.clientX, event.clientY);
  }

  onRightClickMessage(event: MouseEvent, message: any) {
    if (this.mode === 'ai') return;

    event.preventDefault();
    event.stopPropagation();
    this.contextTarget = { type: 'message', data: message };
    this.openContextMenu(event.clientX, event.clientY);
  }

  openContextMenu(x: number, y: number) {
    const menuWidth = 220;
    const menuHeight = 240;
    const padding = 10;

    this.contextMenuX = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));
    this.contextMenuY = Math.max(padding, Math.min(y, window.innerHeight - menuHeight - padding));
    this.contextMenuOpen = true;
  }

  closeContextMenu() {
    this.contextMenuOpen = false;
    this.contextTarget = null;
  }

  ctxDetails() {
    this.closeContextMenu();
  }

  ctxDelete() {
    const target = this.contextTarget;
    if (!target) return;

    if (target.type === 'message') {
      this.deleteMessage(target.data.id);
      this.closeContextMenu();
      return;
    }

    if (target.type === 'aiConversation') {
      this.deleteAiConversation(target.data.key);
      this.closeContextMenu();
      return;
    }

    const key = target.data?.key;
    if (!key) {
      this.closeContextMenu();
      return;
    }

    if (!confirm('Biztos törlöd ezt a beszélgetést?')) {
      this.closeContextMenu();
      return;
    }

    this.http.delete(`/api/messages/conversation/${key}`, { withCredentials: true }).subscribe({
      next: () => {
        if (String(this.activeKey) === String(key)) {
          this.goBackToList();
        }
        this.loadConversations();
        this.closeContextMenu();
      },
      error: () => {
        this.closeContextMenu();
      }
    });
  }

  ctxMute() {
    this.closeContextMenu();
  }

  ctxDisable() {
    this.closeContextMenu();
  }

  ctxBlock() {
    this.closeContextMenu();
  }

  toggleMenu(id: number, event: MouseEvent) {
    if (this.mode === 'ai') return;

    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  ctxEditMessage() {
    const target = this.contextTarget;
    if (target?.type !== 'message' || !this.isOwnMessage(target.data)) {
      this.closeContextMenu();
      return;
    }

    this.startEdit(target.data);
    this.closeContextMenu();
  }

  ctxReport() {
    const target = this.contextTarget;
    if (!target) return;

    if (target.type === 'conversation') {
      this.prepareProfileReport(target.data);
      this.closeContextMenu();
      return;
    }

    if (target.type === 'message' && !this.isOwnMessage(target.data)) {
      this.prepareMessageReport(target.data);
      this.closeContextMenu();
    }
  }

  ctxHide() {
    this.closeContextMenu();
  }

  toggleMessageMenu(id: number, event: MouseEvent) {
    if (this.mode === 'ai') return;

    event.stopPropagation();
    this.messageMenuId = this.messageMenuId === id ? null : id;
  }

  scrollToBottom(smooth = true) {
    const container = this.messagesContainer?.nativeElement;

    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      return;
    }

    this.bottom?.nativeElement.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest'
    });
  }

  startEdit(message: any) {
    if (this.mode === 'ai') return;

    this.editingMessageId = message.id;
    this.editText = message.context;
    this.openMenuId = null;
  }

  cancelEdit() {
    this.editingMessageId = null;
    this.editText = '';
  }

  saveEdit() {
    if (this.mode === 'ai' || !this.editText.trim() || !this.editingMessageId) return;

    this.http.patch(
      `/api/messages/${this.editingMessageId}`,
      { context: this.editText },
      { withCredentials: true }
    ).subscribe(() => {
      this.editingMessageId = null;
      this.editText = '';

      if (this.activeKey) {
        this.openConversation(this.activeKey);
      }

      this.loadConversations();
    });
  }

  deleteMessage(id: number) {
    if (this.mode === 'ai') return;

    this.openMenuId = null;

    if (!confirm('Biztos törlöd az üzenetet?')) return;

    this.http.delete(`/api/messages/${id}`, { withCredentials: true }).subscribe(() => {
      if (this.activeKey) {
        this.openConversation(this.activeKey);
      }

      this.loadConversations();
    });
  }

  goToConversation(key: string) {
    this.setMode('messages');
    this.router.navigate(['/user/messages', key]);

    if (this.isMobile) {
      this.mobileView = 'chat';
    }
  }

  goToAiConversation(key: string) {
    this.setMode('ai');
    this.openAiConversation(key);
  }

  selectAiResponseMessage(message: AiConversationMessage | any) {
    if (message?.sender !== 'ai' || message?.loading) return;

    this.selectedAiResponseMessageId = Number(message?.id) || null;
    this.selectedAiResponseProducts = this.dedupeAiProducts(
      Array.isArray(message?.products) ? message.products : []
    );
  }

  loadAuth() {
    this.http.get<any>('/api/auth/me', { withCredentials: true }).subscribe((response) => {
      this.authUserId = response?.user?.id ?? null;

      this.aiStore.getActiveConversationKey().subscribe((savedKey) => {
        this.activeAiKey = savedKey;

        this.loadAiConversations(() => {
          if (this.mode === 'ai' && !this.activeAiKey) {
            if (this.aiConversations.length) {
              this.openAiConversation(this.aiConversations[0].key);
            } else {
              this.aiMessages = [this.buildSystemMessage()];
            }
          }
        });
      });
    });
  }

  loadConversations() {
    this.http.get<any[]>('/api/messages/conversations', { withCredentials: true }).subscribe((response) => {
      this.conversations = response || [];
    });
  }

  loadUsers() {
    this.http.get<any[]>('/api/users', { withCredentials: true }).subscribe((response) => {
      const allUsers = response || [];
      const existingUserIds = (this.conversations || [])
        .map((c) => c?.otherUserId)
        .filter((x: any) => typeof x === 'number');

      this.users = allUsers.filter((u) =>
        u.id !== this.authUserId && !existingUserIds.includes(u.id)
      );
    });
  }

  openConversation(key: string) {
    this.activeKey = key;

    this.http.get<any>(`/api/messages/conversation/${key}`, { withCredentials: true }).subscribe((response) => {
      this.messages = response?.items || [];
      setTimeout(() => this.scrollToBottom(false), 0);

      if (this.isMobile) {
        this.mobileView = 'chat';
      }
    });
  }

  toggleNewChat() {
    this.showNewChat = !this.showNewChat;

    if (!this.showNewChat) return;

    if (this.mode === 'ai') {
      this.activeAiKey = null;
      this.aiMessages = [this.buildSystemMessage()];

      if (this.isMobile) {
        this.mobileView = 'chat';
      }

      this.showNewChat = false;
      return;
    }

    this.loadUsers();
  }

  startConversation(user: any) {
    this.http.post<any>(
      '/api/messages/start',
      { user2_id: user.id },
      { withCredentials: true }
    ).subscribe((response) => {
      const panelId = String(response.panelId);

      this.showNewChat = false;
      this.router.navigate(['/user/messages', panelId]);
      this.loadConversations();

      if (this.isMobile) {
        this.mobileView = 'chat';
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.activeSelectionKey) return;

    if (this.mode === 'ai') {
      this.sendAiMessage();
      return;
    }

    const otherId = this.getOtherUserId();
    if (!otherId) return;

    this.http.post(
      '/api/messages/send',
      {
        user2_id: otherId,
        context: this.newMessage
      },
      { withCredentials: true }
    ).subscribe({
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

  sendAiMessage() {
    const text = this.newMessage.trim();
    if (!text) return;

    if (!this.activeAiKey) {
      this.aiStore.createConversation().subscribe((conversation) => {
        this.activeAiKey = conversation.key;
        this.aiConversations = [
          conversation,
          ...this.aiConversations.filter((item) => item.key !== conversation.key)
        ];
        this.sendAiMessage();
      });
      return;
    }

    const baseMessages = [...this.aiMessages];

    const userMessage: AiConversationMessage = {
      id: Date.now(),
      sender: 'me',
      text,
      created_at: new Date().toISOString()
    };

    const loadingMessage: AiConversationMessage = {
      id: Date.now() + 1,
      sender: 'ai',
      text: 'AI gondolkodik...',
      created_at: new Date().toISOString(),
      loading: true
    };

    this.aiMessages = [...baseMessages, userMessage, loadingMessage];
    this.newMessage = '';
    this.saveCurrentAiConversation(this.aiMessages, text);
    setTimeout(() => this.scrollToBottom(), 0);

    const history = baseMessages
      .filter((message) => message.sender !== 'system')
      .map((message) => ({
        role: message.sender === 'me' ? 'user' : 'model',
        text: message.text || ''
      }));

    this.ai.ask(text, history, this.activeAiKey).subscribe({
      next: (response: any) => {
        const result = response?.data;
        const responseConversationKey = String(response?.panel_id || response?.messages_id || '').trim();

        if (responseConversationKey) {
          this.activeAiKey = responseConversationKey;
        }

        const cleanMessages = this.aiMessages.filter((message) => !message.loading);
        const answerText = String(response?.answer || '').trim();

        const attachedProducts =
          result?.mode === 'list' && Array.isArray(result?.list) ? result.list :
            result?.mode === 'product' && Array.isArray(result?.exact) ? result.exact :
              [];

        const aiMessage: AiConversationMessage = {
          id: Date.now() + 2,
          sender: 'ai',
          text: answerText || 'Nincs valasz.',
          created_at: new Date().toISOString(),
          products: attachedProducts.length ? attachedProducts : undefined
        };

        this.aiMessages = [...cleanMessages, aiMessage];
        this.syncSelectedAiResponse();
        this.saveCurrentAiConversation(this.aiMessages, aiMessage.text || '');
        this.loadAiConversations();
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: () => {
        const cleanMessages = this.aiMessages.filter((message) => !message.loading);

        const aiMessage: AiConversationMessage = {
          id: Date.now() + 3,
          sender: 'ai',
          text: 'Hiba történt az AI válasz során.',
          created_at: new Date().toISOString()
        };

        this.aiMessages = [...cleanMessages, aiMessage];
        this.syncSelectedAiResponse();
        this.saveCurrentAiConversation(this.aiMessages, aiMessage.text || '');
        this.loadAiConversations();
      }
    });
  }

  getOtherUserId(): number | null {
    const panel = this.conversations.find((conversation) =>
      String(conversation.key) === String(this.activeKey)
    );

    return panel?.otherUserId ?? null;
  }

  private openAiConversation(key: string) {
    this.activeAiKey = key;

    this.aiStore.setActiveConversationKey(key).subscribe();

    this.aiStore.getConversation(key).subscribe((conversation) => {
      if (conversation?.messages?.length) {
        this.aiMessages = [...conversation.messages];
        this.syncSelectedAiResponse();
      } else {
        this.aiMessages = [this.buildSystemMessage()];
        this.selectedAiResponseMessageId = null;
        this.selectedAiResponseProducts = [];
      }

      if (this.isMobile) {
        this.mobileView = 'chat';
      }

      setTimeout(() => this.scrollToBottom(false), 0);
    });
  }

  private deleteAiConversation(key: string) {
    if (!confirm('Biztos törlöd ezt az AI beszélgetést?')) return;

    this.aiStore.deleteConversation(key).subscribe((conversations) => {
      this.aiConversations = conversations;

      if (this.activeAiKey === key) {
        if (this.aiConversations.length) {
          this.openAiConversation(this.aiConversations[0].key);
        } else {
          this.activeAiKey = null;
          this.aiMessages = [];
          this.aiStore.setActiveConversationKey(null).subscribe();

          if (this.isMobile) {
            this.mobileView = 'list';
          }
        }
      }
    });
  }

  private saveCurrentAiConversation(messages: AiConversationMessage[], lastText: string) {
    if (!this.activeAiKey) return;

    const firstUserMessage = messages.find((message) => message.sender === 'me')?.text || '';

    const conversation: AiConversationRecord = {
      key: this.activeAiKey,
      title: this.aiStore.buildTitle(firstUserMessage),
      lastText,
      updatedAt: new Date().toISOString(),
      messages: messages.filter((message) => !message.loading)
    };

    this.aiStore.saveConversation(conversation).subscribe((conversations) => {
      this.aiConversations = conversations;
    });
  }

  private loadAiConversations(afterLoad?: () => void) {
    this.aiStore.getConversations().subscribe((conversations) => {
      this.aiConversations = conversations;

      if (!this.activeAiKey && this.aiConversations.length) {
        this.activeAiKey = this.aiConversations[0].key;
      }

      if (afterLoad) {
        afterLoad();
      }
    });
  }

  timeAgo(date: string | number): string {
    const diff = Math.floor((this.nowMs - new Date(date).getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  formatAiText(
    text: string,
    products: any[] = []
  ): Array<{ type: 'heading' | 'bullet' | 'paragraph', text: string, mention?: string | null, product?: any | null }> {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const clean = line.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
        const mention = this.extractMentionFromLine(line);
        const product = mention ? this.pickBestMentionMatch(products, mention) : null;

        if (/^#{1,6}\s*/.test(line)) {
          return { type: 'heading', text: clean, mention: null, product: null };
        }

        if (/^[-*•]\s+/.test(line)) {
          return { type: 'bullet', text: clean.replace(/^[-*•]\s+/, ''), mention, product };
        }

        return { type: 'paragraph', text: clean, mention, product };
      });
  }

  openAiMentionByName(name: string, preferredProducts: any[] = []) {
    const q = String(name || '').trim();
    if (!q) return;

    this.selectedAiProduct = { name: q, model: q };
    this.selectedAiProductDetails = null;
    this.selectedAiProductKeys = [];
    this.selectedAiProductError = null;
    this.selectedAiProductLoading = true;

    const localProducts = [
      ...(Array.isArray(preferredProducts) ? preferredProducts : []),
      ...this.displayedMessages
        .filter((message) => Array.isArray((message as any)?.products))
        .flatMap((message: any) => message.products || [])
    ];

    const localTarget = this.pickBestMentionMatch(localProducts, q);

    if (localTarget) {
      this.selectAiProduct(localTarget);
      return;
    }

    this.http.get<any>('/api/products', {
      params: { q, limit: '12' },
      withCredentials: true
    }).subscribe({
      next: (response) => {
        const items = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);

        const target = this.pickBestMentionMatch(items, q);

        if (!target) {
          this.selectedAiProductError = 'Nem találtam ehhez a blokkhoz termékadatot.';
          this.selectedAiProductLoading = false;
          return;
        }

        this.selectAiProduct(target);
      },
      error: () => {
        this.selectedAiProductError = 'Nem sikerült betölteni a termékadatokat.';
        this.selectedAiProductLoading = false;
      }
    });
  }

  openAiMentionBlock(block: { mention?: string | null, product?: any | null }, products: any[] = []) {
    if (block?.product) {
      this.selectAiProduct(block.product);
      return;
    }

    this.openAiMentionByName(String(block?.mention || ''), products);
  }

  buildAiProductPath(product: any): string | null {
    const table = this.resolveProductTable(product);
    const id = this.resolveProductId(product);
    if (!table || id === undefined || id === null) return null;
    return `/product-site/${table}/${id}`;
  }

  buildAiMentionOpenPath(name: string | null | undefined): string {
    return `/product-open/${encodeURIComponent(String(name || '').trim())}`;
  }

  splitAiLineByMention(text: string, mention: string | null | undefined): { before: string; mention: string; after: string } | null {
    const source = String(text || '');
    const needle = String(mention || '').trim();
    if (!source || !needle) return null;

    const lowerSource = source.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const index = lowerSource.indexOf(lowerNeedle);
    if (index === -1) return null;

    return {
      before: source.slice(0, index),
      mention: source.slice(index, index + needle.length),
      after: source.slice(index + needle.length)
    };
  }

  aiInlineDetails(product: any): any {
    return this.normalizeAiDetails(
      product?.data ?? product,
      product,
      this.resolveProductTable(product),
      this.resolveProductId(product)
    );
  }

  aiInlineVisibleKeys(product: any): string[] {
    const details = this.aiInlineDetails(product);
    return Object.keys(details || {})
      .filter((key) => !this.isHiddenAiKey(key))
      .slice(0, 4);
  }

  openAiProduct(product: any) {
    const table = this.resolveProductTable(product);
    const id = this.resolveProductId(product);

    if (table && id !== undefined && id !== null) {
      this.router.navigate(['/product-site', table, id]);
      return;
    }

    this.openAiProductByLookup(product);
  }

  aiResponsePreview(product: any): any {
    return this.normalizeAiDetails(
      product?.data ?? product,
      product,
      this.resolveProductTable(product),
      this.resolveProductId(product)
    );
  }

  aiResponsePreviewKeys(product: any): string[] {
    const details = this.aiResponsePreview(product);
    return Object.keys(details || {})
      .filter((key) => !this.isHiddenAiKey(key))
      .slice(0, 3);
  }

  aiResponseDisplayName(product: any): string {
    const details = this.aiResponsePreview(product);
    return String(details?.model || details?.name || product?.name || product?.model || 'N/A').trim();
  }

  aiResponseDisplayManufacturer(product: any): string {
    const details = this.aiResponsePreview(product);
    return String(details?.manufacturer || product?.manufacturer || '').trim();
  }

  aiResponseDisplayPrice(product: any): string {
    const details = this.aiResponsePreview(product);
    const parsed = this.parseAiPrice(details?.price);
    return parsed == null ? 'N/A' : `${parsed.toLocaleString('hu-HU')} Ft`;
  }

  openAiResponseProduct(event: MouseEvent, product: any) {
    event.preventDefault();
    event.stopPropagation();
    this.openAiProduct(product);
  }

  private selectAiProduct(product: any) {
    const table = this.resolveProductTable(product);
    const id = this.resolveProductId(product);

    this.selectedAiProduct = product;
    this.selectedAiProductDetails = null;
    this.selectedAiProductKeys = [];
    this.selectedAiProductError = null;

    if (!table || id === undefined || id === null) {
      this.selectedAiProductError = 'Nem sikerült beazonosítani a terméket.';
      return;
    }

    this.selectedAiProductLoading = true;

    this.productService.getProductDetails(String(table), String(id)).subscribe({
      next: (res: any) => {
        const item = this.normalizeAiDetails(res?.item ?? res, product, table, id);
        this.selectedAiProductDetails = item;
        this.selectedAiProductKeys = Object.keys(item || {});
        this.selectedAiProductLoading = false;
      },
      error: () => {
        this.selectedAiProductDetails = this.normalizeAiDetails(product?.data ?? product, product, table, id);
        this.selectedAiProductKeys = Object.keys(this.selectedAiProductDetails || {});
        this.selectedAiProductLoading = false;
      }
    });
  }

  private openAiProductByLookup(product: any) {
    const query = String(
      product?.name ??
      product?.model ??
      product?.data?.name ??
      product?.data?.model ??
      ''
    ).trim();

    if (!query) return;

    this.http.get<any>('/api/products', {
      params: { q: query, limit: '12' },
      withCredentials: true
    }).subscribe({
      next: (response) => {
        const items = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);

        const target = this.pickBestMentionMatch(items, query);

        if (target) {
          this.selectAiProduct(target);
        }
      },
      error: () => {}
    });
  }

  private resolveProductTable(product: any): string {
    const direct =
      product?.table_name ??
      product?.source_table ??
      product?.table ??
      product?.product_table ??
      product?.data?.table_name ??
      product?.data?.source_table ??
      product?.data?.table ??
      product?.data?.product_table;

    if (String(direct ?? '').trim()) {
      return String(direct).trim();
    }

    const type = String(
      product?.type ??
      product?.category ??
      product?.data?.type ??
      product?.data?.category ??
      ''
    ).trim().toLowerCase();

    return this.aiTypeToTable[type] || '';
  }

  private resolveProductId(product: any): number | string | null {
    const rawId =
      product?.id ??
      product?.product_id ??
      product?.products_id ??
      product?.data?.id ??
      product?.data?.product_id ??
      product?.data?.products_id;

    if (rawId === undefined || rawId === null || rawId === '') {
      return null;
    }

    return rawId;
  }

  private pickBestMentionMatch(items: any[], name: string): any | null {
    const normalizedTarget = this.normalizeMention(name);

    if (!items.length || !normalizedTarget) {
      return null;
    }

    const exact = items.find((item) =>
      this.normalizeMention(item?.name || item?.model) === normalizedTarget
    );

    if (exact) return exact;

    const contains = items.find((item) => {
      const candidate = this.normalizeMention(item?.name || item?.model);
      return candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate);
    });

    return contains || items[0] || null;
  }

  private normalizeMention(value: any): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private extractMentionFromLine(line: string): string | null {
    const cleanedLine = String(line || '').replace(/\*\*/g, '').trim();

    if (!cleanedLine || /^#{1,6}\s*/.test(cleanedLine)) {
      return null;
    }

    const match = cleanedLine.match(
      /^[-*•]?\s*([A-Z0-9][A-Za-z0-9+/.()' -]{2,90}?)(?:\s+[–-]\s+|:\s*$|\s+\d[\d\s,.]*\s*(ft|forint)\s*$)/i
    );

    if (!match) return null;

    const candidate = String(match[1] || '').trim().replace(/[.:;,]+$/, '');
    if (!candidate || candidate.length < 4) return null;

    return candidate;
  }

  private isHiddenAiKey(key: string): boolean {
    const normalized = String(key || '').toLowerCase();

    return [
      'id',
      'created_at',
      'updated_at',
      'price',
      'manufacturer',
      'model',
      'name',
      'table_name',
      'source_table',
      'product_table',
      'table',
      'category',
      'type',
      'products',
      'data'
    ].includes(normalized);
  }

  private normalizeAiDetails(item: any, fallbackProduct: any, table: any, id: any): any {
    const source = item && typeof item === 'object' ? item : {};

    return {
      ...source,
      table_name: source?.table_name ?? table,
      id: source?.id ?? id,
      manufacturer:
        source?.manufacturer ??
        source?.Manufacturer ??
        fallbackProduct?.manufacturer ??
        fallbackProduct?.data?.manufacturer ??
        '',
      model:
        source?.model ??
        source?.Model ??
        source?.name ??
        fallbackProduct?.name ??
        fallbackProduct?.model ??
        fallbackProduct?.data?.model ??
        '',
      price: this.parseAiPrice(
        source?.price ??
        source?.Price ??
        source?.price_range ??
        source?.['Price Range (Ft)'] ??
        fallbackProduct?.price ??
        fallbackProduct?.data?.price ??
        null
      )
    };
  }

  private parseAiPrice(raw: any): number | null {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : null;

    const nums = (String(raw).match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(Number.isFinite);

    if (!nums.length) return null;
    if (nums.length === 1) return Math.round(nums[0]);

    return Math.round((Math.min(...nums) + Math.max(...nums)) / 2);
  }

  private buildSystemMessage(): AiConversationMessage {
    return {
      id: Date.now(),
      sender: 'system',
      text: 'Kérdezz bármit, és az első üzenetnél létrejön az új AI beszélgetés.',
      created_at: new Date().toISOString()
    };
  }

  private dedupeAiProducts(products: any[]): any[] {
    const seen = new Set<string>();

    return (products || []).filter((product) => {
      const key = [
        this.resolveProductTable(product),
        this.resolveProductId(product),
        this.normalizeMention(
          product?.name ||
          product?.model ||
          product?.data?.name ||
          product?.data?.model
        )
      ].join('|');

      if (!key.replace(/\|/g, '').trim() || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private syncSelectedAiResponse() {
    const selected = this.aiMessages.find((message: any) => message?.id === this.selectedAiResponseMessageId);

    if (selected && Array.isArray((selected as any)?.products) && (selected as any).products.length) {
      this.selectedAiResponseProducts = this.dedupeAiProducts((selected as any).products || []);
      return;
    }

    const latest = [...this.aiMessages].reverse().find((message: any) =>
      message?.sender === 'ai' &&
      Array.isArray(message?.products) &&
      message.products.length
    );

    if (latest) {
      this.selectedAiResponseMessageId = Number((latest as any).id) || null;
      this.selectedAiResponseProducts = this.dedupeAiProducts((latest as any).products || []);
      return;
    }

    this.selectedAiResponseMessageId = null;
    this.selectedAiResponseProducts = [];
  }
}
