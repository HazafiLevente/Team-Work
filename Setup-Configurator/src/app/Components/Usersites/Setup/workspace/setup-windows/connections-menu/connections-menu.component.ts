import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
    selector: 'app-connections-menu',
    standalone: true,
    imports: [CommonModule, HttpClientModule],
    templateUrl: './connections-menu.component.html',
    styleUrls: ['./connections-menu.component.css']
})
export class ConnectionsMenuComponent implements OnInit {
    @Input() setup: any;
    connections: any[] = [];
    loading = false;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        if (this.setup) {
            this.loadConnections();
        }
    }

    loadConnections(): void {
        const sId = this.setup.id || this.setup.setup_id;
        if (!sId) return;

        this.loading = true;
        this.http.get<any[]>(`/api/setup/${sId}/connections`, { withCredentials: true })
            .subscribe({
                next: (conns) => {
                    this.connections = conns || [];
                    this.loading = false;
                },
                error: (err) => {
                    console.error('❌ Connections load error:', err);
                    this.loading = false;
                }
            });
    }

    deleteConnection(id: number): void {
        if (!confirm('Biztosan törlöd ezt az összekötést?')) return;

        this.http.delete(`/api/setup/connections/${id}`, { withCredentials: true })
            .subscribe({
                next: () => {
                    this.connections = this.connections.filter(c => c.id !== id);
                    // TODO: optionally emit an event if global refresh is needed
                },
                error: (err) => {
                    console.error('❌ Connection delete error:', err);
                    alert('Hiba történt a törlés során.');
                }
            });
    }
}
