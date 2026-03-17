import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AiService } from '../../../Services/AI/ai.service';

interface ChatMessage {
  id: number;
  sender: 'me' | 'ai' | 'system' | 'product';
  text?: string;
  products?: any[];
  loading?: boolean;
}

@Component({
  selector: 'app-messages-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.panel.component.html',
  styleUrls: ['./messages.panel.component.css']
})
export class MessagesPanelComponent implements OnInit, OnDestroy {

  @Output() close = new EventEmitter<void>();

  constructor(
    private ai: AiService,
    private router: Router
  ) {}

  messages: ChatMessage[] = [
    {
      id: 1,
      sender: 'system',
      text: 'Kérdezz bármit a termékekről 👌'
    }
  ];

  newMessage = '';
  isLoading = false;

  ngOnInit(): void {
    document.body.classList.add('ai-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('ai-open');
  }

  // ha van X gombod: ezt hívd
  onClose(): void {
    this.close.emit();
  }

  send() {
    if (!this.newMessage.trim() || this.isLoading) return;

    const userText = this.newMessage;

    this.messages.push({
      id: Date.now(),
      sender: 'me',
      text: userText
    });

    this.newMessage = '';
    this.isLoading = true;

    const loadingMsg: ChatMessage = {
      id: Date.now() + 1,
      sender: 'ai',
      text: 'AI gondolkodik...',
      loading: true
    };

    this.messages.push(loadingMsg);

    const history = this.messages
      .filter(m => !m.loading && m.sender !== 'system')
      .map(m => ({
        role: m.sender === 'me' ? 'user' : 'model',
        text: m.text || (m.products ? `Termékek: ${m.products.map(p => p.name).join(', ')}` : '')
      }));

    this.ai.ask(userText, history).subscribe({
      next: (res: any) => {
        const result = res?.data;

        this.removeLoading();

        // Lista mód
        if (result?.mode === 'list' && result.list?.length) {
          this.messages.push({
            id: Date.now(),
            sender: 'product',
            products: result.list
          });
          return;
        }

        // Product mód
        if (result?.mode === 'product' && result.exact?.length) {
          this.messages.push({
            id: Date.now(),
            sender: 'product',
            products: result.exact
          });
          return;
        }

        this.messages.push({
          id: Date.now(),
          sender: 'ai',
          text: res?.answer ?? 'Nincs válasz.'
        });
      },
      error: () => {
        this.removeLoading();
        this.messages.push({
          id: Date.now(),
          sender: 'ai',
          text: '⚠️ Hiba történt az AI válasz során.'
        });
      }
    });
  }

  private removeLoading() {
    this.messages = this.messages.filter(m => !m.loading);
    this.isLoading = false;
  }

  openProduct(p: any) {
    this.router.navigateByUrl(`/product.html?table=${p.table}&id=${p.id}`);
  }
}
