import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface SystemMessage {
    id: number;
    title: string;
    message: string;
    target: string;
    sender: number;
    created_at: string;
}

@Component({
    standalone: true,
    selector: 'app-admin-system',
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-system.component.html',
    styleUrls: ['./admin-system.component.css']
})
export class AdminSystemComponent implements OnInit {

    // -------- Form --------
    newTitle = '';
    newMessage = '';
    newTarget = 'all';
    customTarget = '';
    sending = false;
    sendError = '';
    sendSuccess = '';

    // -------- List --------
    messages: SystemMessage[] = [];
    loading = true;

    readonly TARGET_OPTIONS = [
        { value: 'all', label: '🌐 Mindenki' },
        { value: 'admin', label: '🛡️ Admin' },
        { value: 'admin+', label: '🛡️ Admin+' },
        { value: 'owner', label: '👑 Owner' },
        { value: 'custom', label: '👤 Egyedi felhasználó (ID)' }
    ];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadMessages();
    }

    loadMessages() {
        this.loading = true;
        this.http.get<{ messages: SystemMessage[] }>('/api/admin/system-messages', { withCredentials: true })
            .subscribe({
                next: res => {
                    this.messages = res.messages || [];
                    this.loading = false;
                },
                error: err => {
                    console.error('❌ system-messages load:', err);
                    this.loading = false;
                }
            });
    }

    get resolvedTarget(): string {
        return this.newTarget === 'custom' ? this.customTarget.trim() : this.newTarget;
    }

    send() {
        this.sendError = '';
        this.sendSuccess = '';

        const target = this.resolvedTarget;
        if (!this.newTitle.trim() || !this.newMessage.trim() || !target) {
            this.sendError = 'Minden mezőt töltsd ki!';
            return;
        }

        this.sending = true;

        this.http.post<any>('/api/admin/system-message', {
            title: this.newTitle.trim(),
            message: this.newMessage.trim(),
            target
        }, { withCredentials: true }).subscribe({
            next: () => {
                this.sendSuccess = '✅ Üzenet elküldve!';
                this.newTitle = '';
                this.newMessage = '';
                this.newTarget = 'all';
                this.customTarget = '';
                this.sending = false;
                this.loadMessages();

                setTimeout(() => this.sendSuccess = '', 3000);
            },
            error: err => {
                this.sendError = err?.error?.error || 'Hiba történt!';
                this.sending = false;
            }
        });
    }

    deleteMessage(id: number) {
        this.http.delete(`/api/admin/system-message/${id}`, { withCredentials: true })
            .subscribe({
                next: () => this.loadMessages(),
                error: err => console.error('❌ delete error:', err)
            });
    }

    formatDate(d: string): string {
        return new Date(d).toLocaleString('hu-HU');
    }

    targetLabel(target: string): string {
        const opt = this.TARGET_OPTIONS.find(o => o.value === target);
        if (opt) return opt.label;
        return `👤 User #${target}`;
    }
}
