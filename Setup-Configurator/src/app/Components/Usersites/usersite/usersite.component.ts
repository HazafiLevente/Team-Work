import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-usersite',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule   // ⬅️ EZ HIÁNYZOTT
  ],
  templateUrl: './usersite.component.html',
  styleUrls: ['./usersite.component.css']
})
export class UsersiteComponent {}
