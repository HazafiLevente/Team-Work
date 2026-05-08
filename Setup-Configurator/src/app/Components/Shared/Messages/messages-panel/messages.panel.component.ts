import { Component, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AiService } from '../../../Services/AI/ai.service';
import {
  AiConversationMessage,
  AiConversationRecord,
  AiConversationStoreService
} from '../../../Services/AI/ai-conversation-store.service';

@Component({
  selector: 'app-messages-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.panel.component.html',
  styleUrls: ['./messages.panel.component.css']
})
export class MessagesPanelComponent implements OnInit, OnDestroy {
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
  private readonly toolTypeMeta: Array<{ match: RegExp; icon: string; label: string }> = [
    { match: /(cpu|processzor)/i, icon: 'chip', label: 'Processzor' },
    { match: /(gpu|video|grafikus|vga)/i, icon: 'monitor', label: 'Grafika' },
    { match: /(speaker|hangfal|studio_monitor|soundbar|subwoofer|receiver|audio)/i, icon: 'volume-2', label: 'Audio' },
    { match: /(motherboard|alaplap)/i, icon: 'circuit-board', label: 'Alaplap' },
    { match: /(ram|memoria)/i, icon: 'memory-stick', label: 'Memoria' },
    { match: /(psu|power|tapegyseg)/i, icon: 'battery-charging', label: 'Tapegyseg' },
    { match: /(guitar|drums|trumpet|saxophone|instrument)/i, icon: 'music-4', label: 'Hangszer' },
    { match: /(switch|server|storage|network)/i, icon: 'server', label: 'Halozat' }
  ];

  @Output() close = new EventEmitter<void>();

  messages: AiConversationMessage[] = [];
  newMessage = '';
  isLoading = false;
  activeConversationKey: string | null = null;

  constructor(
    private http: HttpClient,
    private ai: AiService,
    private router: Router,
    private aiStore: AiConversationStoreService
  ) {}

  ngOnInit(): void {
    document.body.classList.add('ai-open');
    this.restoreConversation();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('ai-open');
  }

  onClose(): void {
    this.close.emit();
  }

  send() {
    const userText = this.newMessage.trim();
    if (!userText || this.isLoading) return;

    if (!this.activeConversationKey) {
      this.aiStore.createConversation().subscribe((conversation) => {
        this.activeConversationKey = conversation.key;
        this.aiStore.setActiveConversationKey(conversation.key).subscribe();
        this.send();
      });
      return;
    }

    const baseMessages = [...this.messages];
    const userMessage: AiConversationMessage = {
      id: Date.now(),
      sender: 'me',
      text: userText,
      created_at: new Date().toISOString()
    };

    const loadingMessage: AiConversationMessage = {
      id: Date.now() + 1,
      sender: 'ai',
      text: 'AI gondolkodik...',
      created_at: new Date().toISOString(),
      loading: true
    };

    this.messages = [...baseMessages, userMessage, loadingMessage];
    this.newMessage = '';
    this.isLoading = true;
    this.persistCurrentConversation(this.messages, userText);

    const history = baseMessages
      .filter((message) => !message.loading && message.sender !== 'system')
      .map((message) => ({
        role: message.sender === 'me' ? 'user' : 'model',
        text: message.text || (
          Array.isArray(message.products)
            ? `Termékek: ${message.products.map((product) => product?.name || product?.model || 'ismeretlen').join(', ')}`
            : ''
        )
      }));

    this.ai.ask(userText, history, this.activeConversationKey).subscribe({
      next: (res: any) => {
        const result = res?.data;
        const responseConversationKey = String(res?.panel_id || res?.messages_id || '').trim();
        if (responseConversationKey) {
          this.activeConversationKey = responseConversationKey;
          this.aiStore.setActiveConversationKey(responseConversationKey).subscribe();
        }

        const cleanMessages = this.messages.filter((message) => !message.loading);
        const answerText = String(res?.answer || '').trim();
        const attachedProducts =
          result?.mode === 'list' && Array.isArray(result?.list) ? result.list :
          result?.mode === 'product' && Array.isArray(result?.exact) ? result.exact :
          [];

        if (answerText) {
          cleanMessages.push({
            id: Date.now(),
            sender: 'ai',
            text: answerText,
            created_at: new Date().toISOString(),
            products: attachedProducts.length ? attachedProducts : undefined
          });
        }

        const aiMessage: AiConversationMessage = answerText
          ? cleanMessages[cleanMessages.length - 1]
          : {
              id: Date.now(),
              sender: 'ai',
              text: 'Nincs válasz.',
              created_at: new Date().toISOString(),
              products: attachedProducts.length ? attachedProducts : undefined
            };

        this.messages = answerText ? [...cleanMessages] : [...cleanMessages, aiMessage];
        this.isLoading = false;
        this.persistCurrentConversation(this.messages, (answerText || aiMessage.text || ''));
      },
      error: () => {
        const cleanMessages = this.messages.filter((message) => !message.loading);
        const aiMessage: AiConversationMessage = {
          id: Date.now(),
          sender: 'ai',
          text: 'Hiba történt az AI válasz során.',
          created_at: new Date().toISOString()
        };

        this.messages = [...cleanMessages, aiMessage];
        this.isLoading = false;
        this.persistCurrentConversation(this.messages, aiMessage.text || '');
      }
    });
  }

  openProduct(product: any) {
    const table = this.resolveProductTable(product);
    const id = this.resolveProductId(product);
    if (table && id !== undefined && id !== null) {
      this.router.navigate(['/product-site', table, id]).then(() => this.close.emit());
      return;
    }

    this.openProductByLookup(product);
  }

  handleProductCardClick(event: MouseEvent, product: any) {
    event.preventDefault();
    event.stopPropagation();
    this.openProduct(product);
  }

  openMentionByName(name: string) {
    const q = String(name || '').trim();
    if (!q) return;

    const localProducts = this.messages
      .filter((message) => Array.isArray((message as any)?.products))
      .flatMap((message: any) => message.products || []);

    const localTarget = this.pickBestMentionMatch(localProducts, q);
    if (localTarget) {
      this.openProduct(localTarget);
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
        if (!target) return;
        this.openProduct(target);
      },
      error: () => {}
    });
  }

  formatAiText(text: string, products: any[] = []): Array<{ type: 'heading' | 'bullet' | 'paragraph', text: string, mention?: string | null, product?: any | null }> {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const clean = line.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
        const mention = this.extractMentionFromLine(line);
        const product = mention ? this.pickBestMentionMatch(products, mention) : null;
        if (/^#{1,6}\s*/.test(line)) {
          return { type: 'heading' as const, text: clean, mention: null, product: null };
        }

        if (/^[-*•]\s+/.test(line)) {
          const bulletText = clean.replace(/^[-*•]\s+/, '');
          return {
            type: 'bullet' as const,
            text: bulletText,
            mention,
            product
          };
        }

        return {
          type: 'paragraph' as const,
          text: clean,
          mention,
          product
        };
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

  buildProductPath(product: any): string | null {
    const table = this.resolveProductTable(product);
    const id = this.resolveProductId(product);
    if (!table || id === undefined || id === null) return null;
    return `/product-site/${table}/${id}`;
  }

  buildMentionOpenPath(name: string | null | undefined): string {
    return `/product-open/${encodeURIComponent(String(name || '').trim())}`;
  }

  openMentionBlock(block: { mention?: string | null, product?: any | null }) {
    const product = block?.product;

    if (product) {
      const table = this.resolveProductTable(product);
      const id = this.resolveProductId(product);
      if (table && id !== undefined && id !== null) {
        window.location.assign(`/product-site/${table}/${id}`);
        return;
      }
    }

    this.openMentionByName(String(block?.mention || ''));
  }

  handleMentionLinkClick(event: MouseEvent, block: { mention?: string | null, product?: any | null }) {
    const href = this.buildProductPath(block?.product);

    if (href) {
      window.location.assign(href);
      event.preventDefault();
      return;
    }


  }

  openInlineProductCard(event: MouseEvent, product: any, mention?: string | null) {
    event.preventDefault();
    event.stopPropagation();

    if (product) {
      this.openProduct(product);
      return;
    }

    this.openMentionByName(String(mention || ''));
  }

  private openProductByLookup(product: any) {
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
        if (!target) return;

        const table = this.resolveProductTable(target);
        const id = this.resolveProductId(target);
        if (!table || id === undefined || id === null) return;

        this.router.navigate(['/product-site', table, id]).then(() => this.close.emit());
      },
      error: () => {}
    });
  }

  private pickBestMentionMatch(items: any[], name: string): any | null {
    const normalizedTarget = this.normalizeMention(name);
    if (!items.length || !normalizedTarget) return null;

    const exact = items.find((item) => this.normalizeMention(item?.name || item?.model) === normalizedTarget);
    if (exact) return exact;

    const contains = items.find((item) => {
      const candidate = this.normalizeMention(item?.name || item?.model);
      return candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate);
    });

    return contains || items[0] || null;
  }

  private resolveToolMeta(...values: any[]): { icon: string; label: string } {
    const haystack = values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');

    const matched = this.toolTypeMeta.find((item) => item.match.test(haystack));
    return matched || { icon: 'sparkles', label: 'Eszkoz' };
  }

  private formatToolSubtitle(value: string): string {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
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
    if (!cleanedLine) return null;
    if (/^#{1,6}\s*/.test(cleanedLine)) return null;

    const match = cleanedLine.match(/^[-*•]?\s*([A-Z0-9][A-Za-z0-9+/.()' -]{2,90}?)(?:\s+[–-]\s+|:\s*$|\s+\d[\d\s,.]*\s*(ft|forint)\s*$)/i);
    if (!match) return null;

    const candidate = String(match[1] || '').trim().replace(/[.:;,]+$/, '');
    if (!candidate || candidate.length < 4) return null;
    if (/^(hazimozi|hangfalak|talalt termekek|melyik tipus|ezek az eszkozok|kivalo kiegeszitok|talaltam nehany relevans termeket|professzionalis megoldasok|aktiv hangfalak|szamitogepes alkatreszek)/i.test(candidate)) {
      return null;
    }

    return candidate;
  }

  private persistCurrentConversation(messages: AiConversationMessage[], lastText: string) {
    if (!this.activeConversationKey) return;

    const firstUserMessage = messages.find((message) => message.sender === 'me')?.text || '';
    const conversation: AiConversationRecord = {
      key: this.activeConversationKey,
      title: this.aiStore.buildTitle(firstUserMessage),
      lastText,
      updatedAt: new Date().toISOString(),
      messages: messages.filter((message) => !message.loading)
    };

    this.aiStore.saveConversation(conversation).subscribe();
  }

  private restoreConversation() {
    this.aiStore.getActiveConversationKey().subscribe((key) => {
      if (!key) {
        this.aiStore.getConversations().subscribe((conversations) => {
          const latest = conversations[0];
          if (!latest?.key) {
            this.messages = [this.buildSystemMessage()];
            return;
          }

          this.activeConversationKey = latest.key;
          this.aiStore.setActiveConversationKey(latest.key).subscribe();
          this.aiStore.getConversation(latest.key).subscribe((conversation) => {
            this.messages = conversation?.messages?.length
              ? [...conversation.messages]
              : [this.buildSystemMessage()];
          });
        });
        return;
      }

      this.activeConversationKey = key;
      this.aiStore.getConversation(key).subscribe((conversation) => {
        if (conversation?.messages?.length) {
          this.messages = [...conversation.messages];
          return;
        }

        this.messages = [this.buildSystemMessage()];
      });
    });
  }

  private buildSystemMessage(): AiConversationMessage {
    return {
      id: Date.now(),
      sender: 'system',
      text: 'Kérdezz bármit, és az első üzenetnél létrejön az új AI beszélgetés.',
      created_at: new Date().toISOString()
    };
  }
}
