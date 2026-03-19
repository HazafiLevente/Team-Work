import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home-theater-builder-modal',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './home-theater-builder.component.html',
  styleUrls: ['./home-theater-builder.component.css']
})
export class HomeTheaterBuilderComponent implements OnChanges {

  @Input() setup: any;

  devices: any[] = [];
  connections: any[] = [];

  loading = false;
  error = '';

  newDeviceType = '';
  newDeviceRefId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(): void {
    if (!this.setup) return;
    this.loadDevices();
    this.loadConnections();
  }

  private setupId(): any {
    return this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
  }

  loadDevices(): void {
    const id = this.setupId();
    if (!id) return;

    this.loading = true;

    this.http.get<any[]>(`/api/home-theater/${id}/devices`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.devices = res || [];
          this.loading = false;
        },
        error: () => {
          this.devices = [];
          this.loading = false;
          this.error = 'Device load error';
        }
      });
  }

  loadConnections(): void {
    const id = this.setupId();
    if (!id) return;

    this.http.get<any[]>(`/api/home-theater/${id}/connections`, { withCredentials: true })
      .subscribe({
        next: (res) => this.connections = res || [],
        error: () => this.connections = []
      });
  }

  createDevice(): void {
    const id = this.setupId();
    if (!id || !this.newDeviceType || !this.newDeviceRefId) return;

    this.http.post<any>(
      `/api/home-theater/device`,
      {
        home_setup_id: id,
        device_type: this.newDeviceType,
        device_ref_id: this.newDeviceRefId
      },
      { withCredentials: true }
    ).subscribe({
      next: (created) => {
        this.devices = [created, ...this.devices];
        this.newDeviceType = '';
        this.newDeviceRefId = null;
      }
    });
  }
}
