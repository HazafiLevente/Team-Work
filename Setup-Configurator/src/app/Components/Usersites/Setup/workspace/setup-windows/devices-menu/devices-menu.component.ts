import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { DeviceComponent } from '../device/device.component';

type PaginatedItemsResponse = {
  items: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
};

@Component({
  selector: 'app-devices-menu',
  standalone: true,
  imports: [
    CommonModule,
    DeviceComponent
  ],
  templateUrl: './devices-menu.component.html',
  styleUrls: ['./devices-menu.component.css']
})
export class DevicesMenuComponent implements OnInit {
  private readonly pageSize = 20;

  @Input() setup: any;

  devices: any[] = [];
  loading = false;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPage(1);
  }

  trackByDevice(index:number,item:any){
    return item?.id ?? index;
  }

  loadPage(page: number): void {
    const setupId =
      this.setup?.id ??
      this.setup?.setup_id ??
      this.setup?.setupId;

    if (!setupId) return;

    this.loading = true;

    this.http
      .get<PaginatedItemsResponse>(`/api/setup/${setupId}/get-children`, {
        withCredentials: true,
        params: {
          page,
          limit: this.pageSize
        }
      })
      .subscribe({
        next: (res) => {
          const pagination = res?.pagination;

          this.devices = Array.isArray(res?.items) ? res.items : [];
          this.currentPage = pagination?.page ?? page;
          this.totalPages = Math.max(pagination?.totalPages ?? 1, 1);
          this.totalItems = pagination?.total ?? this.devices.length;
          this.loading = false;
        },
        error: () => {
          this.devices = [];
          this.currentPage = 1;
          this.totalPages = 1;
          this.totalItems = 0;
          this.loading = false;
        }
      });
  }

  prevPage(): void {
    if (this.currentPage <= 1 || this.loading) return;
    this.loadPage(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages || this.loading) return;
    this.loadPage(this.currentPage + 1);
  }

  goToPage(page: number): void {
    if (page === this.currentPage || this.loading) return;
    this.loadPage(page);
  }

  visiblePages(): number[] {
    const total = this.totalPages;
    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const start = Math.max(Math.min(this.currentPage - 2, total - 4), 1);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }

}
