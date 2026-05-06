import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UsersComponent } from '../users/users.component';
import { ProductsSiteComponent } from '../product-site/products.site.component';
import { AdminSystemComponent } from '../system/admin-system.component';
import { AdminLogsComponent } from '../logs/admin-logs.component';
import { AdminReportsComponent } from '../reports/admin-reports.component';


@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule, UsersComponent, ProductsSiteComponent, AdminSystemComponent, AdminLogsComponent, AdminReportsComponent],
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
  activityDays: string[] = [];
  activityDaySet = new Set<string>();

  calendarMonth = new Date();
  calendarCells: Array<{
    date: Date | null;
    iso: string | null;
    inMonth: boolean;
    active: boolean;
    isToday: boolean;
  }> = [];

  readonly weekDays = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];
  selectedUserId: number | null = null;
  selectedDayIso: string | null = null;
  selectedDayDetails: { date: string; unique: number; total_requests: number; max_count?: number; min_count?: number; avg_count?: number; users: any[] } | null = null;
  dayLoading = false;

  get selectedUsers(): any[] {
    return this.selectedDayDetails?.users || [];
  }

  uniqueBarWidthPct(): number {
    const v = this.selectedDayDetails?.unique || 0;
    return Math.min(100, Math.max(0, v * 10));
  }

  requestsBarWidthPct(): number {
    const v = this.selectedDayDetails?.total_requests || 0;
    return Math.min(100, Math.max(0, v / 5));
  }

  activeSection: 'dashboard' | 'users' | 'products' | 'reports' | 'system' | 'logs' = 'dashboard';

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

  openReports() {
    this.activeSection = 'reports';
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
          this.activityDays = res.activityDays || [];
          this.activityDaySet = new Set(this.activityDays);
          this.buildCalendar();
        },
        error: err => console.error('Daily stats error:', err)
      });
  }

  private isoDate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  private mondayBasedDayIndex(jsDay: number) {
    // JS: 0=Sun..6=Sat -> Monday=0..Sunday=6
    return (jsDay + 6) % 7;
  }

  prevMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  openDay(iso: string | null) {
    if (!iso) return;
    this.selectedDayIso = iso;
    this.selectedDayDetails = null;
    this.dayLoading = true;

    this.http.get<any>(`/api/admin/active-users/day/${encodeURIComponent(iso)}`, { withCredentials: true })
      .subscribe({
        next: res => {
          this.selectedDayDetails = res;
          this.dayLoading = false;
        },
        error: err => {
          console.error('Day details error:', err);
          this.dayLoading = false;
        }
      });
  }

  closeDay() {
    this.selectedDayIso = null;
    this.selectedDayDetails = null;
  }

  buildCalendar() {
    const first = this.startOfMonth(this.calendarMonth);
    const last = this.endOfMonth(this.calendarMonth);

    const today = new Date();
    const todayIso = this.isoDate(today);

    const leadEmpty = this.mondayBasedDayIndex(first.getDay());
    const daysInMonth = last.getDate();

    const cells: typeof this.calendarCells = [];

    for (let i = 0; i < leadEmpty; i++) {
      cells.push({ date: null, iso: null, inMonth: false, active: false, isToday: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(first.getFullYear(), first.getMonth(), day);
      const iso = this.isoDate(d);
      const active = this.activityDaySet.has(iso);
      cells.push({
        date: d,
        iso,
        inMonth: true,
        active,
        isToday: iso === todayIso
      });
    }

    // pad to full weeks (multiple of 7)
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, iso: null, inMonth: false, active: false, isToday: false });
    }

    this.calendarCells = cells;
  }

  get calendarTitle() {
    return this.calendarMonth.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
  }

  getMaxUsers(): number {
    if (!this.dailyStats.length) return 1;
    return Math.max(1, ...this.dailyStats.map((d: any) => d.unique));
  }

  onUserDblClick(user: any) {
    this.selectedUserId = user.id;
    this.activeSection = 'users';
  }

  onUserExpanded(userId: number | null) {

    if (userId === this.selectedUserId) {
      this.selectedUserId = null;
    }
  }
}
