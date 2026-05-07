import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'log' | 'warn' | 'error';
    message: string;
}

@Component({
    standalone: true,
    selector: 'app-admin-logs',
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-logs.component.html',
    styleUrls: ['./admin-logs.component.css']
})
export class AdminLogsComponent implements OnInit, OnDestroy {

    logs: LogEntry[] = [];
    loading = true;


    levelFilter = '';
    searchFilter = '';


    autoRefresh = true;
    private refreshInterval: any;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadLogs();
        this.startAutoRefresh();
    }

    ngOnDestroy() {
        this.stopAutoRefresh();
    }

    loadLogs() {
        let url = '/api/admin/logs?limit=500';
        if (this.levelFilter) url += `&level=${this.levelFilter}`;
        if (this.searchFilter) url += `&search=${encodeURIComponent(this.searchFilter)}`;

        this.http.get<{ logs: LogEntry[] }>(url, { withCredentials: true })
            .subscribe({
                next: res => {
                    this.logs = res.logs || [];
                    this.loading = false;
                },
                error: err => {
                    console.error('❌ logs load:', err);
                    this.loading = false;
                }
            });
    }

    clearLogs() {
        if (!confirm('Biztosan törölni akarod az összes logot?')) return;
        this.http.delete('/api/admin/logs', { withCredentials: true })
            .subscribe({
                next: () => this.loadLogs(),
                error: err => console.error('❌ logs clear:', err)
            });
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        if (this.autoRefresh) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    private startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => this.loadLogs(), 3000);
    }

    private stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    formatTime(ts: string): string {
        return new Date(ts).toLocaleString('hu-HU');
    }

    levelIcon(level: string): string {
        switch (level) {
            case 'error': return '🔴';
            case 'warn': return '🟡';
            default: return '🔵';
        }
    }

    applyFilters() {
        this.loadLogs();
    }

    resetFilters() {
        this.levelFilter = '';
        this.searchFilter = '';
        this.loadLogs();
    }
}
