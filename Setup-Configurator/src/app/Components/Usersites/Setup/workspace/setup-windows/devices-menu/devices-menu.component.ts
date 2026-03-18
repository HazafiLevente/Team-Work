import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { DeviceComponent } from '../device/device.component';

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

  @Input() setup: any;

  devices: any[] = [];
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {

    const setupId =
      this.setup?.id ??
      this.setup?.setup_id ??
      this.setup?.setupId;

    if (!setupId) return;

    this.loading = true;

    this.http
      .get<any[]>(`/api/setup/${setupId}/get-children`, { withCredentials: true })
      .subscribe({
        next: (res) => {

          this.devices = Array.isArray(res) ? res : [];
          this.loading = false;

        },
        error: () => {

          this.devices = [];
          this.loading = false;

        }
      });

  }

  trackByDevice(index:number,item:any){
    return item?.id ?? index;
  }

}
