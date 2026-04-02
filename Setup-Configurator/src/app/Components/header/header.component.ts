import {
  Component, HostListener, OnInit, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { gsap } from 'gsap';
import { take } from 'rxjs/operators';

import { AuthService } from '../Services/Auth/auth.service';
import { BellService, BellItem } from '../Services/Bell/bell.service';
import { text } from '../../Constants/constants';
import { GoogleTranslateComponent } from '../Shared/GoogleTranslate/google-translate.component';
import { RankPanelComponent } from '../Rank-Panel/rank-panel.component';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [CommonModule, RouterLink, RankPanelComponent, GoogleTranslateComponent]
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
    public bell: BellService,
  ) {}

  ngOnInit() {
    this.user$ = this.auth.user$;

    // 🔥 EZ HIÁNYZOTT
    this.auth.check().subscribe();

    this.bellOpen$ = this.bell.open$;
    this.bellItems$ = this.bell.items$;
  }


  ngAfterViewInit() {
    const el = this.userMenuRef?.nativeElement;
    if (!el) return;

    // ✅ kezdeti állapot: becsukva
    gsap.set(el, {
      opacity: 0,
      height: 0,
      y: -6,
      scale: 0.98,
      overflow: 'hidden',
      pointerEvents: 'none'
    });
  }

  toggleMenu() {
    const el = this.userMenuRef?.nativeElement;
    if (!el) return;

    this.menuTl?.kill();

    if (!this.dropdownOpen) {
      this.dropdownOpen = true;

      this.menuTl = gsap.timeline();

      // ✅ méréshez: legyen renderelhető
      this.menuTl.set(el, {
        pointerEvents: 'auto',
        overflow: 'hidden',
        height: 'auto',
        opacity: 1,     // ideiglenesen 1, hogy layout biztosan frissüljön
        y: 0,
        scale: 1
      });

      // ✅ a tuti magasság: scrollHeight (nem offsetHeight)
      const targetH = el.scrollHeight;

      // ✅ vissza zárt állapotba, és onnan animálunk
      this.menuTl.set(el, { height: 0, opacity: 0, y: -6, scale: 0.98 });

      this.menuTl.to(el, {
        height: targetH,
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.22,
        ease: 'power3.out',
        onComplete: () => {
          // ✅ nyitva legyen "auto", hogy ha tartalom változik, ne vágja el
          // zárás előtt fixáljuk az aktuális magasságot (ha auto volt)
          gsap.set(el, { height: el.offsetHeight });

        }
      });

    } else {
      this.closeMenu();
    }
  }


  @HostListener('document:click')
  closeAll() {
    this.closeMenu();
    this.bell.close();
  }

  private closeMenu() {
    const el = this.userMenuRef?.nativeElement;

    if (!el) {
      this.dropdownOpen = false;
      return;
    }
    if (!this.dropdownOpen) return;

    this.menuTl?.kill();
    this.dropdownOpen = false;

    // ✅ zárás: height vissza 0 + fade
    this.menuTl = gsap.timeline({
      onComplete: () => {
        gsap.set(el, { pointerEvents: 'none' });
      }
    });

    this.menuTl.to(el, {
      height: 0,
      opacity: 0,
      y: -6,
      scale: 0.98,
      duration: 0.18,
      ease: 'power2.in'
    });
  }

  openRanks() {
    this.user$.pipe(take(1)).subscribe(u => {
      if (!u) return;
      this.ranksOpen = true;
      this.closeMenu();
    });
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
    this.bell.close();

    this.router.navigate(['/notifications'], {
      queryParams: {
        tab: n.type   // 'system' | 'news' | 'register'
      }
    });
  }

  bellTypeLabel(n: BellItem): string {
    const type = String(n?.type || '').toLowerCase();

    if (type === 'system') return 'Rendszer';
    if (type === 'news') return 'Hir';
    if (type === 'register') return 'Regisztracio';
    if (type === 'message') return 'Uzenet';

    return 'Ertesites';
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/login');
    });
  }

}
