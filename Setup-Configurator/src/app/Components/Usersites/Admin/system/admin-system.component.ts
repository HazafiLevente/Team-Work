import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface SystemMessage {
    id: number;
    title: string;
    message: string;
    target: string;
    sender: number | null;
    category: 'system' | 'news' | 'register' | string;
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

    newTitle = '';
    newMessage = '';
    newTarget = 'all';
    newCategory: SystemMessage['category'] = 'system';
    customTarget = '';
    sending = false;
    sendError = '';
    sendSuccess = '';

    messages: SystemMessage[] = [];
    loading = true;
    activeCategoryFilter: 'all' | SystemMessage['category'] = 'all';

    readonly TARGET_OPTIONS = [
        { value: 'all', label: 'Mindenki' },
        { value: 'admin', label: 'Admin' },
        { value: 'admin+', label: 'Admin+' },
        { value: 'owner', label: 'Tulajdonos' },
        { value: 'custom', label: 'Egyéni felhasználó (ID)' }
    ];

    readonly CATEGORY_OPTIONS = [
        { value: 'system', label: 'Rendszer' },
        { value: 'news', label: 'Hírek' },
        { value: 'register', label: 'Regisztráció' }
    ];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadMessages();
    }

    loadMessages() {
        this.loading = true;

        const categoryQuery = this.activeCategoryFilter !== 'all'
            ? `?category=${encodeURIComponent(this.activeCategoryFilter)}`
            : '';

        this.http.get<{ messages: SystemMessage[] }>(`/api/admin/system-messages${categoryQuery}`, { withCredentials: true })
            .subscribe({
                next: res => {
                    this.messages = res.messages || [];
                    this.loading = false;
                },
                error: err => {
                    console.error('system-messages load failed:', err);
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
            this.sendError = 'Minden mezot tolts ki!';
            return;
        }

        this.sending = true;

        this.http.post<any>('/api/admin/system-message', {
            title: this.newTitle.trim(),
            message: this.newMessage.trim(),
            target,
            category: this.newCategory
        }, { withCredentials: true }).subscribe({
            next: () => {
                this.sendSuccess = 'Uzenet elkuldve.';
                this.newTitle = '';
                this.newMessage = '';
                this.newTarget = 'all';
                this.newCategory = 'system';
                this.customTarget = '';
                this.sending = false;
                this.loadMessages();

                setTimeout(() => this.sendSuccess = '', 3000);
            },
            error: err => {
                this.sendError = err?.error?.error || 'Hiba tortent!';
                this.sending = false;
            }
        });
    }

    deleteMessage(id: number) {
        this.http.delete(`/api/admin/system-message/${id}`, { withCredentials: true })
            .subscribe({
                next: () => this.loadMessages(),
                error: err => console.error('delete error:', err)
            });
    }

    formatDate(d: string): string {
        return new Date(d).toLocaleString('hu-HU');
    }

    targetLabel(target: string): string {
        const opt = this.TARGET_OPTIONS.find(o => o.value === target);
        if (opt) return opt.label;
        return `User #${target}`;
    }

    categoryLabel(category: string): string {
        const opt = this.CATEGORY_OPTIONS.find(o => o.value === category);
        return opt?.label || category || 'Rendszer';
    }

    setCategoryFilter(category: 'all' | SystemMessage['category']): void {
        if (this.activeCategoryFilter === category) return;
        this.activeCategoryFilter = category;
        this.loadMessages();
    }
}
