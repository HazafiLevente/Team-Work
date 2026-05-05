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
  deletingDeviceId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPage(1);
  }

  trackByDevice(index:number,item:any){
    return item?.id ?? index;
  }

  isNoteSetup(): boolean {
    return this.setup?.isNote === true || this.setup?.is_note === true || this.setup?.isnote === true;
  }

  deviceName(device: any): string {
    return String(device?.display_name ?? device?.name ?? device?.model ?? 'Eszkoz');
  }

  deviceMeta(device: any): string {
    return String(device?.manufacturer ?? device?.category ?? device?.source_table ?? device?.type ?? '');
  }

  devicePrice(device: any): string {
    const price = this.parsePrice(device?.price ?? device?.Price ?? device?.price_huf ?? device?.['Price Range (Ft)']);
    return price == null ? '0 Ft' : new Intl.NumberFormat('hu-HU').format(price) + ' Ft';
  }

  totalPrice(): string {
    const total = this.devices
      .map((device) => this.parsePrice(device?.price ?? device?.Price ?? device?.price_huf ?? device?.['Price Range (Ft)']))
      .filter((price): price is number => price !== null)
      .reduce((sum, price) => sum + price, 0);

    return new Intl.NumberFormat('hu-HU').format(total) + ' Ft';
  }

  removeNoteDevice(device: any): void {
    const itemId = Number(device?.id ?? 0);
    const tableName = this.resolveDeviceTableName(device);
    const setupId = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? device?.setup_id ?? device?.room_id;

    const deleteUrl = tableName === 'setups'
      ? `/api/setup/remove-child-setup/${itemId}`
      : '/api/setup/remove-item';
    const deleteBody = tableName === 'setups'
      ? { roomId: setupId }
      : { itemId, tableName, setupId };

    console.error('[devices-menu] delete clicked', {
      url: deleteUrl,
      body: deleteBody,
      itemId,
      tableName,
      setupId,
      deletingDeviceId: this.deletingDeviceId,
      device,
      setup: this.setup
    });

    if (!itemId) {
      console.error('[devices-menu] delete stopped: missing itemId', { device, setup: this.setup });
      return;
    }

    if (this.deletingDeviceId) {
      console.error('[devices-menu] delete stopped: another delete is running', {
        deletingDeviceId: this.deletingDeviceId,
        nextItemId: itemId
      });
      return;
    }

    this.deletingDeviceId = itemId;

    console.error('[devices-menu] delete request', {
      url: deleteUrl,
      body: deleteBody
    });

    const request = tableName === 'setups'
      ? this.http.request('delete', deleteUrl, {
          body: deleteBody,
          withCredentials: true
        })
      : this.http.request('delete', deleteUrl, {
          body: deleteBody,
          withCredentials: true
        });

    request.subscribe({
      next: (res) => {
        this.deletingDeviceId = null;
        this.loadPage(this.currentPage);
      },
      error: (err) => {
        console.error('[devices-menu] delete failed', {
          url: deleteUrl,
          body: deleteBody,
          status: err?.status,
          statusText: err?.statusText,
          error: err?.error,
          message: err?.message,
          raw: err
        });
        this.deletingDeviceId = null;
      }
    });
  }

  private resolveDeviceTableName(device: any): string {
    if (this.isSetupRoomContext()) return 'setups';
    if (device?.room_id != null) return 'setups';
    if (device?.setup_id != null && device?.device_id != null) return 'setup_devices';
    return device?.category ?? device?.table_name ?? device?.table ?? 'setups';
  }

  private isSetupRoomContext(): boolean {
    return this.setup?.room_id == null;
  }

  private parsePrice(value: any): number | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;

    const nums = (String(value).match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(Number.isFinite);

    if (!nums.length) return null;
    if (nums.length === 1) return Math.round(nums[0]);

    return Math.round((Math.min(...nums) + Math.max(...nums)) / 2);
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
