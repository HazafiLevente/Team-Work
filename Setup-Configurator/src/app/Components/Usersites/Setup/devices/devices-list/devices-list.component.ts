import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DevicesComponent } from '../devices/devices.component';

@Component({
  selector: 'app-devices-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DevicesComponent],
  templateUrl: './devices-list.component.html',
  styleUrls: ['./devices-list.component.css']
})
export class DevicesListComponent implements OnChanges {
  @Input() setup: any;
  @Output() openItemWindow = new EventEmitter<any>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLElement>;

  devices: any[] = [];
  loading = false;
  errorMsg = '';

  ctxOpen = false;
  ctxX = 0;
  ctxY = 0;
  ctxDevice: any = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup']) {
      this.loadDevices();
    }
  }

  get stageEl(): HTMLElement | null {
    return this.stageRef?.nativeElement ?? null;
  }

  private getItemId(): any {
    return this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
  }

  loadDevices(): void {
    const itemId = this.getItemId();

    if (!itemId) {
      this.devices = [];
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.ctxOpen = false;
    this.ctxDevice = null;

    this.http.get<any[]>(`/api/setup/${itemId}/children`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const rawDevices = Array.isArray(res) ? res : [];

          this.devices = rawDevices.map((device, index) => ({
            ...device,
            x: Number(device?.x ?? 40 + (index % 5) * 180),
            y: Number(device?.y ?? 40 + Math.floor(index / 5) * 120),
            __editing: false
          }));

          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Eszköz betöltési hiba:', err);
          this.devices = [];
          this.loading = false;
          this.errorMsg = 'Az eszközök betöltése sikertelen.';
        }
      });
  }

  onDeviceDragEnded(payload: { device: any; pos: { x: number; y: number } }): void {
    const deviceId = payload?.device?.id;
    if (!deviceId) return;

    this.devices = this.devices.map(d =>
      String(d?.id) === String(deviceId)
        ? { ...d, x: payload.pos.x, y: payload.pos.y }
        : d
    );
  }

  onDeviceRightClick(payload: { device: any; x: number; y: number }): void {
    this.ctxDevice = payload.device;
    this.ctxX = payload.x;
    this.ctxY = payload.y;
    this.ctxOpen = true;
  }

  onDeviceDblClick(device: any): void {
    this.openItemWindow.emit(device);
  }

  openDevice(device: any): void {
    this.openItemWindow.emit(device);
    this.closeContextMenu();
  }

  renameDevice(device: any): void {
    this.devices = this.devices.map(d =>
      String(d?.id) === String(device?.id)
        ? { ...d, __editing: true }
        : { ...d, __editing: false }
    );

    this.closeContextMenu();
  }

  deleteDevice(device: any): void {
    console.log('Törlés:', device);
    this.closeContextMenu();
  }

  onDeviceRenamed(device: any): void {
    const deviceId = device?.id;
    if (!deviceId) return;

    const newName = (device?.display_name || device?.name || '').trim();
    if (!newName) return;

    this.devices = this.devices.map(d =>
      String(d?.id) === String(deviceId)
        ? { ...d, display_name: newName, name: newName, __editing: false }
        : d
    );

    this.http.patch(
      `/api/setup/children/${deviceId}/rename`,
      { name: newName, display_name: newName },
      { withCredentials: true }
    ).subscribe({
      next: () => {},
      error: (err) => {
        console.error('❌ Device rename hiba:', err);
      }
    });
  }

  closeContextMenu(): void {
    this.ctxOpen = false;
    this.ctxDevice = null;
  }

  closeEditing(): void {
    this.devices = this.devices.map(d => ({ ...d, __editing: false }));
  }

  trackByDevice(index: number, device: any): any {
    return device?.id ?? index;
  }

  getDeviceDataId(device: any): string {
    const category = String(device?.category || 'device')
      .toLowerCase()
      .replace('[setup]', '')
      .trim();

    return `${category}:${device?.id}`;
  }
}
