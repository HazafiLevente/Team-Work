import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-notifications-page',
  imports: [CommonModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css'
})
export class NotificationsPageComponent implements OnInit {

  activeTab: 'system' | 'news' | 'register' = 'system';

  systemMessages: any[] = [];
  newsMessages: any[] = [];
  registerMessages: any[] = [];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadAll();

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadAll() {
    this.http.get<any>('/api/bell', { withCredentials: true })
      .subscribe(res => {

        const items = res?.items || [];

        this.systemMessages = items.filter((i: any) => i.type === 'system');
        this.newsMessages = items.filter((i: any) => i.type === 'news');
        this.registerMessages = items.filter((i: any) => i.type === 'register');

      });
  }

  setTab(tab: 'system' | 'news' | 'register') {
    this.activeTab = tab;
  }

}
