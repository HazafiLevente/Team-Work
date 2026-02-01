import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importáld be a szobalista komponenst, ha külön komponensben van
import { SetupRoomlistComponent } from '../setup-roomlist/setup-roomlist.component';

@Component({
  selector: 'app-setup',
  standalone: true,
  // Tedd be az imports-ba a Roomlist-et, hogy tudd használni a HTML-ben
  imports: [CommonModule, SetupRoomlistComponent],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent {
  // A fő setup oldal logikája
}
