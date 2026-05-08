import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ReportDetail {
  id?: number | string;
  property_id?: number | string;
  property: string;
  value: unknown;
}

interface AdminReport {
  id: number | string;
  title: string;
  type?: 'profile' | 'message' | string;
  created_at?: string;
  reporter_user_id?: string | number;
  reported_user_id?: string | number;
  report_type?: string;
  report_message?: string;
  details: ReportDetail[];
  expanded?: boolean;
  [key: string]: unknown;
}

@Component({
  standalone: true,
  selector: 'app-admin-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.css']
})
export class AdminReportsComponent implements OnInit {
  reports: AdminReport[] = [];
  loading = true;
  error = '';
  search = '';
  activeType: 'profile' | 'message' = 'profile';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.loading = true;
    this.error = '';

    this.http.get<{ reports: AdminReport[] }>('/api/admin/reports', { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.reports = res.reports || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Jelentések betöltési hiba', err);
          this.error = err.error?.error || 'Nem sikerult betolteni a reportokat.';
          this.loading = false;
        }
      });
  }

  get filteredReports(): AdminReport[] {
    const term = this.search.trim().toLowerCase();
    const byType = this.reports.filter((report) => (report.type || 'profile') === this.activeType);
    if (!term) return byType;

    return byType.filter((report) => {
      const haystack = [
        report.id,
        report.title,
        report.type,
        report.created_at,
        report.reporter_user_id,
        report.reported_user_id,
        report.report_type,
        report.report_message,
        ...report.details.flatMap((detail) => [detail.property, detail.value])
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }

  countByType(type: 'profile' | 'message'): number {
    return this.reports.filter((report) => (report.type || 'profile') === type).length;
  }

  setActiveType(type: 'profile' | 'message') {
    this.activeType = type;
  }

  toggle(report: AdminReport) {
    report.expanded = !report.expanded;
  }

  deleteReport(report: AdminReport) {
    if (!confirm(`Biztosan torlod ezt a reportot? (#${report.id})`)) return;

    this.http.delete(`/api/admin/reports/${report.id}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.reports = this.reports.filter((item) => String(item.id) !== String(report.id));
        },
        error: (err) => {
          alert(err.error?.error || 'Nem sikerult torolni a reportot.');
        }
      });
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('hu-HU');
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
