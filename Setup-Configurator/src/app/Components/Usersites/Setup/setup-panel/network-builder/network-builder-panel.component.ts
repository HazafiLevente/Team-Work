import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type NetworkType = 'modem' | 'router' | 'switch';

@Component({
  selector: 'app-network-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './network-builder-panel.component.html',
  styleUrls: ['./network-builder-panel.component.css']
})
export class NetworkBuilderPanelComponent implements OnChanges {
  @Input() setup: any;
  @Input() editChildSetupId: number | null = null;
  @Input() initialProductId: number | null = null;
  @Input() initialNetworkType: NetworkType | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  devices: any[] = [];
  selectedType: NetworkType = 'router';
  selectedDeviceKey = '';

  readonly networkTypes: { key: NetworkType; label: string }[] = [
    { key: 'modem', label: 'Modem' },
    { key: 'router', label: 'Router' },
    { key: 'switch', label: 'Switch' }
  ];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.resetForm();
      this.loadNetworkOptions();
    }
    if (changes['initialNetworkType'] && this.initialNetworkType) {
      this.selectedType = this.initialNetworkType;
    }
    if (changes['initialProductId'] && this.initialProductId != null) {
      this.selectedDeviceKey = String(this.initialProductId);
    }

    // In some flows the list item doesn't include product_id; resolve via backend from child id.
    if ((changes['editChildSetupId'] || changes['setup']) && this.editChildSetupId && !this.initialProductId) {
      const childId = Number(this.editChildSetupId);
      this.http.get<any>(`/api/setup/child-device/${childId}`, { withCredentials: true }).subscribe({
        next: (res) => {
          const pid = Number(res?.device?.product_id ?? res?.device?.device_id ?? 0) || null;
          if (pid) {
            this.selectedDeviceKey = String(pid);
            // if options already loaded, also correct the tab to match the real device type
            const selected = this.devices.find((d) => d?.__deviceKey === this.selectedDeviceKey) ?? null;
            const t = String(selected?.type ?? '').toLowerCase();
            if (t === 'modem' || t === 'router' || t === 'switch') {
              this.selectedType = t as NetworkType;
            }
          }
        },
        error: () => {
          // ignore, selection just won't be prefilled
        }
      });
    }
  }

  private resetForm(): void {
    this.selectedType = 'router';
    this.selectedDeviceKey = '';
    this.loading = false;
    this.saving = false;
    this.error = '';
    this.success = '';
  }

  private setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private unwrapDevices(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.devices)) return res.devices;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.products)) return res.products;
    return [];
  }

  public getDeviceKey(device: any): string {
    return String(device?.id ?? device?.ID ?? '');
  }

  private parseDeviceKey(key: string): number | null {
    const parsedId = key == null || key === '' ? null : Number(key);
    return parsedId == null || Number.isNaN(parsedId) ? null : parsedId;
  }

  loadNetworkOptions(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    this.http.get<any>('/api/setup/network-options', { withCredentials: true }).subscribe({
      next: (res) => {
        this.devices = this.unwrapDevices(res).map((device: any) => ({
          ...device,
          __deviceKey: this.getDeviceKey(device)
        }));

        // If we already have a selected device key (Modify flow), ensure the active tab
        // matches the device's real type so the <select> can actually show the selection.
        if (this.selectedDeviceKey) {
          const selected = this.devices.find((d) => d?.__deviceKey === this.selectedDeviceKey) ?? null;
          const t = String(selected?.type ?? '').toLowerCase();
          if (t === 'modem' || t === 'router' || t === 'switch') {
            this.selectedType = t as NetworkType;
          }
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('network options load error:', err);
        this.error = 'Nem sikerult betolteni a halozati eszkozoket.';
        this.loading = false;
      }
    });
  }

  setType(type: NetworkType): void {
    this.selectedType = type;
    this.selectedDeviceKey = '';
    this.error = '';
    this.success = '';
  }

  filteredDevices(): any[] {
    return this.devices.filter((device) => String(device?.type || '').toLowerCase() === this.selectedType);
  }

  getSelectedDevice(): any | null {
    if (!this.selectedDeviceKey) return null;
    return this.devices.find(device => device.__deviceKey === this.selectedDeviceKey) ?? null;
  }

  getDeviceLabel(device: any): string {
    return String(
      device?.display_name ??
      device?.name ??
      `${this.typeLabel(device?.type)} #${device?.id ?? '?'}`
    ).trim();
  }

  typeLabel(type: any): string {
    const normalized = String(type || '').toLowerCase();
    return this.networkTypes.find(item => item.key === normalized)?.label ?? 'Network';
  }

  countForType(type: NetworkType): number {
    return this.devices.filter((device) => String(device?.type || '').toLowerCase() === type).length;
  }

  trackDevice(_: number, device: any): string {
    return device?.__deviceKey ?? this.getDeviceKey(device);
  }

  saveNetworkDevice(): void {
    const sid = this.setupId();
    if (!sid) {
      this.error = 'Hianyzik a setup azonosito.';
      return;
    }

    const productId = this.parseDeviceKey(this.selectedDeviceKey);
    if (productId == null) {
      this.error = 'Valassz egy halozati eszkozt.';
      return;
    }

    const selected = this.getSelectedDevice();
    if (!selected) {
      this.error = 'A kivalasztott eszkoz nem talalhato.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const request = this.editChildSetupId
      ? this.http.patch<any>(
          `/api/setup/replace-child-device/${this.editChildSetupId}`,
          { product_id: productId },
          { withCredentials: true }
        )
      : this.http.post<any>(
          `/api/setup/${sid}/add-network`,
          { product_id: productId, type: this.selectedType },
          { withCredentials: true }
        );

    request.subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Halozati eszkoz sikeresen hozzaadva.';
        this.saved.emit();
      },
      error: (err) => {
        console.error('network add error:', err);
        this.saving = false;
        this.error = 'Nem sikerult hozzaadni a halozati eszkozt.';
      }
    });
  }
}
