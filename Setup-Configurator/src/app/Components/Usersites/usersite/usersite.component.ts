import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-usersite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './usersite.component.html',
  styleUrls: ['./usersite.component.css']
})
export class UsersiteComponent {
  user$!: Observable<any | null>;

  constructor(private auth: AuthService) {
    this.user$ = this.auth.user$;
  }
}
