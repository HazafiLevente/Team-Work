import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { AuthService } from '../Services/Auth/auth.service';
import { BellService, BellItem } from '../Services/Bell/bell.service';
import { text } from '../../Constants/constants';

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

  text = text;

  bellOpen$!: Observable<boolean>;
  bellItems$!: Observable<BellItem[]>;

  constructor(
    public auth: AuthService,
    private router: Router,
    public bell: BellService
  ) {}

  ngOnInit() {
    this.user$ = this.auth.user$;
    this.bellOpen$ = this.bell.open$;
    this.bellItems$ = this.bell.items$;
  }

  toggleBell(event: MouseEvent) {
    event.stopPropagation();
    this.bell.toggle();
  }

  @HostListener('document:click')
  closeAll() {
    this.dropdownOpen = false;
    this.bell.close();
  }

  openMessage(n: any, event: MouseEvent) {
    event.stopPropagation();

    // csak system_message esetén van értelmes "read"
    if (n?.source_table === 'system_message[System]') {
      this.bell.markReadSystem(Number(n.id));
    }

    this.bell.close();
    this.router.navigate(['/user/message']);
  }




  toggleMenu() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
