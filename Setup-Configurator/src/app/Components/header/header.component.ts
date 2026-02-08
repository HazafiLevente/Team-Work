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
import { RankPanelComponent } from '../Rank-Panel/rank-panel.component';


import { gsap } from 'gsap';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [CommonModule, RouterLink, RankPanelComponent]

})
export class HeaderComponent implements OnInit, AfterViewInit {
  user$!: Observable<any | null>;
  dropdownOpen = false;

  text = text;

  bellOpen$!: Observable<boolean>;
  bellItems$!: Observable<BellItem[]>;

  @ViewChild('hdr', { static: true })
  headerRef!: ElementRef<HTMLElement>;

  // ✅ dropdown element ref
  @ViewChild('userMenu', { static: false })
  userMenuRef!: ElementRef<HTMLElement>;

  private ticking = false;

  // ✅ GSAP timeline
  private menuTl?: gsap.core.Timeline;

  constructor(
    public auth: AuthService,
    private router: Router,
    public bell: BellService
  ) {}

  ranksOpen = false;

  openRanks() {
    this.ranksOpen = true;
    this.closeMenuAnimated?.(); // ha van ilyen függvényed, oké
  }

  closeRanks() {
    this.ranksOpen = false;
  }



  ngOnInit() {
    this.user$ = this.auth.user$;
    this.bellOpen$ = this.bell.open$;
    this.bellItems$ = this.bell.items$;
  }

  ngAfterViewInit() {
    this.applyScrollFade();
    this.initUserMenuAnimation();
  }

  private initUserMenuAnimation() {
    const menuEl = this.userMenuRef?.nativeElement;
    if (!menuEl) return;

    // items (stagger)
    const items = Array.from(
      menuEl.querySelectorAll('.menu-title, .muted, hr, .menu-item')
    ) as HTMLElement[];


    // alap állapot (zárt)
    gsap.set(menuEl, {
      height: 0,
      opacity: 0,
      y: -8,
      overflow: 'hidden',
      pointerEvents: 'none'
    });
    gsap.set(items, { y: 10, opacity: 0 });

    const tl = gsap.timeline({ paused: true });


    tl.to(items, {
      y: 0,
      opacity: 1,
      duration: 0.25,
      ease: 'power3.out',
      stagger: 0.03
    }, '-=0.15');

    this.menuTl = gsap.timeline({ paused: true })
      .to(menuEl, {
        height: 'auto',
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: 'back.out(1.6)',
      })
      .to(items, {
        y: 0,
        opacity: 1,
        duration: 0.25,
        ease: 'power3.out',
        stagger: 0.03
      }, '-=0.15');

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

    const MAX_SCROLL = 160;
    const y = Math.max(0, window.scrollY);
    const p = Math.min(1, y / MAX_SCROLL);

    const alpha = (1 - p) * 0.92;
    const blur = (1 - p) * 10;
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
    this.closeMenuAnimated();
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
    this.bell.close();

    const menuEl = this.userMenuRef?.nativeElement;
    if (!menuEl) return;

    if (!this.menuTl) this.initUserMenuAnimation();
    if (!this.menuTl) return;

    this.dropdownOpen = !this.dropdownOpen;

    if (this.dropdownOpen) {
      // ✅ nyitás előtt kattintható
      gsap.set(menuEl, { pointerEvents: 'auto' });
      this.menuTl.play(0);
    } else {
      // ✅ zárás után legyen nem kattintható
      this.menuTl.eventCallback('onReverseComplete', () => {
        gsap.set(menuEl, { pointerEvents: 'none' });
      });
      this.menuTl.reverse();
    }
  }


  private closeMenuAnimated() {
    if (!this.dropdownOpen) return;
    this.dropdownOpen = false;

    const menuEl = this.userMenuRef?.nativeElement;
    if (this.menuTl) {
      this.menuTl.reverse();
      this.menuTl.eventCallback('onReverseComplete', () => {
        if (menuEl) gsap.set(menuEl, { pointerEvents: 'none' });
      });
    } else {
      if (menuEl) gsap.set(menuEl, { height: 0, opacity: 0, pointerEvents: 'none' });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
