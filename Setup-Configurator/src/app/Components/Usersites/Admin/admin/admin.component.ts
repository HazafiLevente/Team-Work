import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UsersComponent } from '../users/users.component';
import { ProductsSiteComponent } from '../product-site/products.site.component';
import { AdminSystemComponent } from '../system/admin-system.component';
import { AdminLogsComponent } from '../logs/admin-logs.component';


@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule, UsersComponent, ProductsSiteComponent, AdminSystemComponent, AdminLogsComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {

  private statsInterval: any;

  users = 0;
  tables = 0;
  productTables = 0;
  products = 0;
  onlineUsers = 0;

  loading = true;
  showDailyStats = false;
  dailyStats: any[] = [];
  onlineList: any[] = [];

  activeSection: 'dashboard' | 'users' | 'products' | 'system' | 'logs' = 'dashboard';

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get<any>('/api/admin/stats', {
      withCredentials: true
    }).subscribe({
      next: res => {
        this.users = res.users;
        this.tables = res.tables;
        this.productTables = res.productTables;
        this.products = res.products;
        this.onlineUsers = res.onlineUsers || 0;
        this.loading = false;
      },
      error: err => {
        console.error('Admin stats error', err);
        this.loading = false;
      }
    });

    // Auto-refresh online count every 10s
    this.statsInterval = setInterval(() => this.refreshOnline(), 10000);
  }

  ngOnDestroy() {
    if (this.statsInterval) clearInterval(this.statsInterval);
  }

  refreshOnline() {
    this.http.get<any>('/api/admin/stats', { withCredentials: true })
      .subscribe({
        next: res => {
          this.onlineUsers = res.onlineUsers || 0;
          if (this.showDailyStats) this.loadDailyStats();
        }
      });
  }


  openProducts() {
    this.activeSection = 'products';
  }


  openUsers() {
    this.activeSection = 'users';
  }

  openDashboard() {
    this.activeSection = 'dashboard';
  }

  openSystem() {
    this.activeSection = 'system';
  }

  openLogs() {
    this.activeSection = 'logs';
  }

  toggleDailyStats() {
    this.showDailyStats = !this.showDailyStats;
    if (this.showDailyStats && this.dailyStats.length === 0) {
      this.loadDailyStats();
    }
  }

  loadDailyStats() {
    this.http.get<any>('/api/admin/active-users', { withCredentials: true })
      .subscribe({
        next: res => {
          this.dailyStats = res.daily || [];
          this.onlineList = res.online || [];
        },
        error: err => console.error('Daily stats error:', err)
      });
  }

  getMaxUsers(): number {
    if (!this.dailyStats.length) return 1;
    return Math.max(1, ...this.dailyStats.map((d: any) => d.unique));
  }
}
