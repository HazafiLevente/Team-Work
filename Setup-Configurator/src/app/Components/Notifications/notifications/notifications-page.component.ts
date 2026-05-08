import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-notifications-page',
  imports: [CommonModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css'
})
export class NotificationsPageComponent implements OnInit {

  activeTab = 'system';
  items: any[] = [];
  categories: string[] = ['system', 'news', 'register'];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const requestedTab = String(params['tab'] || '').trim().toLowerCase();
      if (requestedTab) {
        this.activeTab = requestedTab;
      }
      this.loadAll();
    });
  }

  loadAll() {
    this.http.get<any>('/api/bell', { withCredentials: true })
      .subscribe(res => {
        const items = Array.isArray(res?.items) ? res.items : [];

        this.items = items.map((item: any) => ({
          ...item,
          category: String(item?.category || item?.type || 'system').toLowerCase()
        }));

        const discovered = Array.from(new Set(this.items.map((item: any) => item.category).filter(Boolean)));
        const ordered = ['system', 'news', 'register'];
        const extras = discovered.filter(cat => !ordered.includes(cat)).sort();
        this.categories = [...ordered.filter(cat => discovered.includes(cat) || cat === this.activeTab), ...extras];

        if (!this.categories.includes(this.activeTab)) {
          this.activeTab = this.categories[0] || 'system';
        }
      });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  itemsFor(category: string): any[] {
    return this.items.filter((item: any) => item.category === category);
  }

  tabLabel(category: string): string {
    const value = String(category || '').toLowerCase();
    if (value === 'news') return 'Hírek';
    if (value === 'register') return 'Regisztráció';
    if (value === 'system') return 'Rendszer';
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'System';
  }
}
