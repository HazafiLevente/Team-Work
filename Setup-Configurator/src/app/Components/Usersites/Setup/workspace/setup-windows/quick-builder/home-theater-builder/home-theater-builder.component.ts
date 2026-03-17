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
    @Input() isNewBuild = false;

    get layoutLabel(): string {
        let speakers = 0;
        let subwoofers = 0;
        let atmos = 0;

        this.placedItems.forEach(item => {
            const cat = (item.category || '').toLowerCase();
            const role = (item.role || '').toLowerCase();

            // Speaker types
            const isSpeaker = cat.includes('speaker') || cat.includes('hangszoro');
            const isSub = cat.includes('subwoofer') || cat.includes('melynyomo') || role === 'subwoofer';
            const isAtmos = cat.includes('ceiling') || role === 'atmos' || cat.includes('mennyezeti');

            if (isSub) {
                subwoofers++;
            } else if (isAtmos) {
                atmos++;
            } else if (isSpeaker) {
                speakers++;
            }
        });

        if (speakers === 0 && subwoofers === 0 && atmos === 0) return '';

        let label = `${speakers}.${subwoofers}`;
        if (atmos > 0) {
            label += `.${atmos}`;
        }
        return label;
    }

    catalog: any = {};
    categoryLabels: Record<string, string> = {
        audioProcessors: 'Audio Processzorok',
        receivers: 'Erősítők / Receivers',
        frontSpeakers: 'Front Hangszórók',
        centerSpeakers: 'Center Hangszórók',
        backSpeakers: 'Hátsó Hangszórók',
        sideSpeakers: 'Oldalsó Hangszórók',
        ceilingSpeakers: 'Mennyezeti / Atmos',
        floorSpeakers: 'Padló Hangszórók',
        subwoofers: 'Mélynyomók / Subwoofers',
        bassAmplifiers: 'Bass Erősítők'
    };
    placedItems: HTItem[] = [];
    buildTitle: string = '';
    currentBuildId: number | null = null;

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

        // Ha kifejezetten ÚJ buildet akarunk, akkor ne töltsük be a régit
        if (this.isNewBuild) {
            this.placedItems = [];
            this.currentBuildId = null;
            this.buildTitle = 'Új Házimozi';
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        console.log('HT Builder ngOnChanges:', changes);
        if (changes['setup'] && this.setup && !this.isNewBuild) {
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
        // Ha már tudunk egy konkrét build ID-t, kérjük le azt
        const url = this.currentBuildId ? `/api/home-theater/${id}/build?id=${this.currentBuildId}` : `/api/home-theater/${id}/build`;

        this.http.get<any>(url, { withCredentials: true })
            .subscribe({
                next: (build) => {
                    this.loading = false;
                    this.currentBuildId = build?.id || null;
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
            id: this.currentBuildId, // Küldjük el az ID-t a meglévő build frissítéséhez
            title: this.buildTitle || 'Házimozi Build',
            layout: JSON.stringify(this.placedItems),
            devices: devices
        };

        console.log('Sending HT Build payload:', payload);

        this.http.post<any>('/api/home-theater/build', payload, { withCredentials: true })
            .subscribe({
                next: (res) => {
                    this.saving = false;
                    console.log('HT Build save response:', res);
                    // Ha új build jött létre, jegyezzük meg az ID-t a további mentésekhez
                    if (res?.build?.id) {
                        this.currentBuildId = res.build.id;
                    }
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
        const order = [
            'audioProcessors',
            'receivers',
            'frontSpeakers',
            'centerSpeakers',
            'backSpeakers',
            'sideSpeakers',
            'ceilingSpeakers',
            'floorSpeakers',
            'subwoofers',
            'bassAmplifiers'
        ];

        return Object.keys(this.catalog).sort((a, b) => {
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
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
