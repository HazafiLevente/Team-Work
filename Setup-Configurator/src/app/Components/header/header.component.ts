import {
  Component, HostListener, OnInit, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { gsap } from 'gsap';

import { AuthService } from '../Services/Auth/auth.service';
import { BellService, BellItem } from '../Services/Bell/bell.service';
import { text } from '../../Constants/constants';

// ✅ helyes relatív import a Components/header mappából
import { RankPanelComponent } from '../Rank-Panel/rank-panel.component';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],   // ✅ styleUrls, nem styleUrl
  imports: [CommonModule, RouterLink, RankPanelComponent]
})
export class HeaderComponent implements OnInit, AfterViewInit {
  user$!: Observable<any | null>;
  dropdownOpen = false;

  ranksOpen = false;

  text = text;

  bellOpen$!: Observable<boolean>;
  bellItems$!: Observable<BellItem[]>;

  @ViewChild('userMenu') userMenuRef?: ElementRef<HTMLElement>;

  private menuTl?: gsap.core.Timeline;

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
    const el = this.userMenuRef?.nativeElement;
    if (!el) return;
    gsap.set(el, { opacity: 0, y: -6, scale: 0.98, pointerEvents: 'none' });
  }

  toggleMenu() {
    const el = this.userMenuRef?.nativeElement;
    if (!el) return;

    this.menuTl?.kill();

    if (!this.dropdownOpen) {
      this.dropdownOpen = true;

      this.menuTl = gsap.timeline();
      this.menuTl.set(el, { pointerEvents: 'auto' });
      this.menuTl.to(el, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.22,
        ease: 'power3.out'
      });
    } else {
      this.dropdownOpen = false;

      this.menuTl = gsap.timeline({
        onComplete: () => { gsap.set(el, { pointerEvents: 'none' }); }
      });


      this.menuTl.to(el, {
        opacity: 0,
        y: -6,
        scale: 0.98,
        duration: 0.18,
        ease: 'power2.in'
      });
    }
  }

  @HostListener('document:click')
  closeAll() {
    this.closeMenu();
    this.bell.close();
  }

  private closeMenu() {
    const el = this.userMenuRef?.nativeElement;
    if (!el) { this.dropdownOpen = false; return; }
    if (!this.dropdownOpen) return;

    this.menuTl?.kill();
    this.dropdownOpen = false;

    gsap.to(el, {
      opacity: 0,
      y: -6,
      scale: 0.98,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => { gsap.set(el, { pointerEvents: 'none' }); }
    });
  }

  openRanks() {
    this.ranksOpen = true;
    this.closeMenu();
  }

  closeRanks() {
    this.ranksOpen = false;
  }

  toggleBell(event: MouseEvent) {
    event.stopPropagation();
    this.bell.toggle();
  }

  openMessage(n: any, event: MouseEvent) {
    event.stopPropagation();

    if (n?.source_table === 'system_message[System]') {
      this.bell.markReadSystem(Number(n.id));
    }

    this.bell.close();
    this.router.navigate(['/user/message']);
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
