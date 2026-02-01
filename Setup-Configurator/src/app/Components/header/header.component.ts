import {Component, HostListener, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../Services/Auth/auth.service';
import { Observable } from 'rxjs';
import {BellService} from '../Services/Bell/bell.service';
import { BellItem } from '../Services/Bell/bell.service';

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

  markBellRead(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.bell.markRead(id);
  }

  @HostListener('document:click')
  closeAll() {
    this.dropdownOpen = false;
    this.bell.close();
  }

  openMessage(n: any, event: MouseEvent) {
    event.stopPropagation();
    this.bell.markRead(n.id);
    this.bell.close();
    this.router.navigate(['/user/message', n.type, n.id]);
  }





  toggleMenu() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
