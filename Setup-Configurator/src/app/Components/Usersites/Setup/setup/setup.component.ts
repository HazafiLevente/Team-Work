import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SetupRoomlistComponent } from '../setup-roomlist/setup-roomlist.component';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, SetupRoomlistComponent],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent {}
