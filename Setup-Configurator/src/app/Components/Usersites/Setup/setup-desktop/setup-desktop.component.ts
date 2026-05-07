import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SetupRoomlistComponent } from '../setup-roomlist/setup-roomlist.component';

@Component({
  selector: 'app-setup-desktop',
  standalone: true,
  imports: [CommonModule, SetupRoomlistComponent],
  template: `
    <div class="setup-page">
      <h1>Konfigurációs Központ</h1>
      <app-setup-roomlist [fixedLayout]="'desktop'"></app-setup-roomlist>
    </div>
  `
})
export class SetupDesktopComponent {}

