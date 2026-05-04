import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-device',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device.component.html',
  styleUrls: ['./device.component.css']
})
export class DeviceComponent {

  @Input() device: any;
  @Input() deleting = false;
  @Output() deleteDevice = new EventEmitter<any>();

  getDeviceType(): string {

    const cat = String(this.device?.category || '').toLowerCase();

    if (cat.includes('pc')) return 'pc';
    if (cat.includes('switch')) return 'switch';
    if (cat.includes('router')) return 'router';
    if (cat.includes('modem')) return 'modem';
    if (cat.includes('home_theater')) return 'ht';

    return 'device';
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    console.error('[device-card] delete button clicked', {
      device: this.device,
      deleting: this.deleting
    });
    this.deleteDevice.emit(this.device);
  }

}
