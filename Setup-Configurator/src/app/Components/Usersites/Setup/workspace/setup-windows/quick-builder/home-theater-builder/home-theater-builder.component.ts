import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';

interface HTItem {
    id: string; // Instance ID
    ref_id: number; // Product DB ID
    name: string;
    manufacturer: string;
    type: string;
    category: string;
    x: number;
    y: number;
    rotation: number;
    role?: string;
    connections?: string[]; // IDs of connected items
}

@Component({
    selector: 'app-home-theater-builder',
    standalone: true,
    imports: [CommonModule, HttpClientModule, FormsModule, DragDropModule],
    templateUrl: './home-theater-builder.component.html',
    styleUrls: ['./home-theater-builder.component.css']
})
export class HomeTheaterBuilderComponent implements OnInit, OnChanges {
    @Input() setup: any;
    @Input() startWithSidebarOpen = false;

    catalog: any = {};
    placedItems: HTItem[] = [];
    buildTitle: string = '';

    sidebarOpen = false;
    searchQuery = '';

    loading = false;
    saving = false;

    connectingFrom: string | null = null;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.loadCatalog();
        if (this.startWithSidebarOpen) {
            this.sidebarOpen = true;
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['setup'] && this.setup) {
            this.loadBuild();
        }
    }

    get setupId(): any {
        return this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
    }

    loadCatalog(): void {
        this.http.get<any>('/api/home-theater/catalog', { withCredentials: true })
            .subscribe({
                next: (res) => this.catalog = res || {},
                error: (err) => console.error('HT Catalog Error:', err)
            });
    }

    loadBuild(): void {
        const id = this.setupId;
        if (!id) return;

        this.loading = true;
        this.http.get<any>(`/api/home-theater/${id}/build`, { withCredentials: true })
            .subscribe({
                next: (build) => {
                    this.loading = false;
                    this.buildTitle = build?.setup_name || this.setup?.setup_name || 'Új Házimozi';

                    if (build?.layout) {
                        try {
                            const parsed = typeof build.layout === 'string' ? JSON.parse(build.layout) : build.layout;
                            this.placedItems = Array.isArray(parsed) ? parsed : [];

                            // Ensure internal arrays exist
                            this.placedItems.forEach(item => {
                                if (!item.connections) item.connections = [];
                            });
                        } catch (e) {
                            console.error('Failed to parse layout JSON', e);
                            this.placedItems = [];
                        }
                    } else {
                        this.placedItems = [];
                    }
                },
                error: (err) => {
                    console.error('HT Build load error:', err);
                    this.loading = false;
                }
            });
    }

    saveBuild(): void {
        const id = this.setupId;
        if (!id) return;

        this.saving = true;

        // Prepare devices object for legacy backend compatibility if needed
        const devices: any = {};
        this.placedItems.forEach(item => {
            devices[item.id] = item.ref_id;
        });

        const payload = {
            setup_id: id,
            title: this.buildTitle || 'Házimozi Build',
            layout: JSON.stringify(this.placedItems),
            devices: devices
        };

        this.http.post('/api/home-theater/build', payload, { withCredentials: true })
            .subscribe({
                next: () => {
                    this.saving = false;
                    // Proactive: Notification instead of alert if possible, but alert is fine for now
                },
                error: (err) => {
                    console.error('HT Build save error:', err);
                    this.saving = false;
                }
            });
    }

    toggleSidebar(): void {
        this.sidebarOpen = !this.sidebarOpen;
    }

    addItem(product: any, category: string): void {
        const newItem: HTItem = {
            id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            ref_id: product.id,
            name: product.model || 'Ismeretlen',
            manufacturer: product.manufacturer || '',
            type: product.type || category,
            category: category,
            x: 100,
            y: 100,
            rotation: 0,
            role: category,
            connections: []
        };
        this.placedItems = [...this.placedItems, newItem];
    }

    removeItem(id: string): void {
        this.placedItems = this.placedItems.filter(item => {
            if (item.id === id) return false;
            // Also remove connections to this item
            if (item.connections) {
                item.connections = item.connections.filter(cid => cid !== id);
            }
            return true;
        });
    }

    rotateItem(item: HTItem): void {
        item.rotation = (item.rotation + 45) % 360;
    }

    updateItemRole(item: HTItem, role: string): void {
        item.role = role;
    }

    startConnection(itemId: string): void {
        if (this.connectingFrom === itemId) {
            this.connectingFrom = null;
        } else {
            this.connectingFrom = itemId;
        }
    }

    toggleConnection(targetId: string): void {
        if (!this.connectingFrom || this.connectingFrom === targetId) return;

        const sourceItem = this.placedItems.find(i => i.id === this.connectingFrom);
        if (!sourceItem) return;

        if (!sourceItem.connections) sourceItem.connections = [];

        const index = sourceItem.connections.indexOf(targetId);
        if (index > -1) {
            sourceItem.connections.splice(index, 1);
        } else {
            sourceItem.connections.push(targetId);
        }

        // Keep it reactive
        this.placedItems = [...this.placedItems];
        this.connectingFrom = null;
    }

    onDragEnded(event: CdkDragEnd, item: HTItem): void {
        const pos = event.source.getFreeDragPosition();
        item.x += pos.x;
        item.y += pos.y;
        event.source.reset(); // Reset CDK internal position tracking
    }

    getFilteredCatalog() {
        if (!this.searchQuery) return this.catalog;

        const q = this.searchQuery.toLowerCase();
        const filtered: any = {};

        Object.keys(this.catalog).forEach(cat => {
            filtered[cat] = this.catalog[cat].filter((p: any) =>
                (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
                (p.model && p.model.toLowerCase().includes(q))
            );
        });

        return filtered;
    }

    getCategoryKeys() {
        return Object.keys(this.catalog);
    }

    // Helper for SVG lines
    getItemCenter(item: HTItem) {
        // Approximate center of the card
        return {
            x: item.x + 80,
            y: item.y + 40
        };
    }

    getConnections(): { x1: number, y1: number, x2: number, y2: number }[] {
        const lines: any[] = [];
        this.placedItems.forEach(item => {
            if (item.connections) {
                const start = this.getItemCenter(item);
                item.connections.forEach(targetId => {
                    const target = this.placedItems.find(i => i.id === targetId);
                    if (target) {
                        const end = this.getItemCenter(target);
                        lines.push({
                            x1: start.x,
                            y1: start.y,
                            x2: end.x,
                            y2: end.y
                        });
                    }
                });
            }
        });
        return lines;
    }
}
