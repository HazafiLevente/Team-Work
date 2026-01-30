import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../Services/Auth/auth.service';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [CommonModule, RouterLink]
})
export class HeaderComponent implements OnInit {
  user$!: Observable<any | null>;
  dropdownOpen = false;

  constructor(
    public auth: AuthService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.user$ = this.auth.user$;
  }

  toggleMenu() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
