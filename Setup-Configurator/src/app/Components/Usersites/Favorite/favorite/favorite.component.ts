import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SetupRoomlistComponent } from '../../Setup/setup-roomlist/setup-roomlist.component';


@Component({
  selector: 'app-favorite',
  standalone: true,
  imports: [CommonModule, SetupRoomlistComponent],
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.css']
})
export class FavoriteComponent {}
