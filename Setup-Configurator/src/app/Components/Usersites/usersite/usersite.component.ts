import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usersite',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './usersite.component.html',
  styleUrl: './usersite.component.css'
})
export class UsersiteComponent {}
