import { Component, Input } from '@angular/core';
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

  getDeviceType(): string {

    const cat = String(this.device?.category || '').toLowerCase();

    if (cat.includes('pc')) return 'pc';
    if (cat.includes('switch')) return 'switch';
    if (cat.includes('router')) return 'router';
    if (cat.includes('modem')) return 'modem';
    if (cat.includes('home_theater')) return 'ht';

    return 'device';
  }

}
