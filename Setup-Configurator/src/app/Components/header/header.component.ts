import {
  Component,
  HostListener,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
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
export class HeaderComponent implements OnInit, AfterViewInit {
  user$!: Observable<any | null>;
  dropdownOpen = false;

  text = text;

  bellOpen$!: Observable<boolean>;
  bellItems$!: Observable<BellItem[]>;

  @ViewChild('hdr', { static: true })
  headerRef!: ElementRef<HTMLElement>;

  private ticking = false;

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

  ngAfterViewInit() {
    // 🔥 reload után is jól álljon
    this.applyScrollFade();
  }

  // 🔥 SCROLL → fekete eltűnik
  @HostListener('window:scroll')
  onScroll() {
    if (this.ticking) return;

    this.ticking = true;
    requestAnimationFrame(() => {
      this.applyScrollFade();
      this.ticking = false;
    });
  }

  private applyScrollFade() {
    const el = this.headerRef?.nativeElement;
    if (!el) return;

    // ⬇️ ennyi px alatt tűnik el a fekete
    const MAX_SCROLL = 160;

    const y = Math.max(0, window.scrollY);
    const p = Math.min(1, y / MAX_SCROLL); // 0..1

    // TOP: fekete 0.92 → scrollnál 0
    const alpha = (1 - p) * 0.92;

    // Blur is eltűnik (ha nem kell blur: hagyd 0-n)
    const blur = (1 - p) * 10;

    // Border is halványul
    const borderA = (1 - p) * 0.10;

    el.style.setProperty('--hdrA', alpha.toFixed(3));
    el.style.setProperty('--hdrBlur', `${blur.toFixed(1)}px`);
    el.style.setProperty('--hdrBorderA', borderA.toFixed(3));
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
