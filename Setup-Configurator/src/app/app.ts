import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription, Observable } from 'rxjs';

import { AuthService } from './Components/Services/Auth/auth.service';
import { UiSettingsService, UiThemeKey } from './Components/Services/SettingService/ui-settings.service';

import { HeaderComponent } from './Components/header/header.component';
import { DarkVeilBgComponent } from './Components/Shared/Background/dark-veil-bg.component';
import { ClickSparkComponent } from './Components/Shared/Effects/click-spark/click-spark.component';
import { DockComponent, DockItemData } from './Components/Shared/Dock/dock.component';
import { MessageButtonComponent } from './Components/Shared/Messages/messages-button/messages.button.component';
import { MessagesPanelComponent } from './Components/Shared/Messages/messages-panel/messages.panel.component';

type ThemePalette = {
  pageAccent: string;
  pageAccent2: string;
  accentPurple: string;
  accentCyan: string;
  accentMagenta: string;
  themeBand1: string;
  themeBand2: string;
  themeBand3: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    RouterOutlet,
    DarkVeilBgComponent,
    ClickSparkComponent,
    DockComponent,
    MessageButtonComponent,
    MessagesPanelComponent,
    CommonModule
  ],
  templateUrl: './app.html'
})
export class App implements OnInit, OnDestroy {
  open = false;

  private sub?: Subscription;
  private userSub?: Subscription;

  user$!: Observable<any | null>;
  dockItems: DockItemData[] = [];
  hideGlobalDock = false;
  private readonly themePalettes: Record<UiThemeKey, ThemePalette> = {
    'clean-cyan': {
      pageAccent: '#67e8f9',
      pageAccent2: '#38bdf8',
      accentPurple: '#38bdf8',
      accentCyan: '#67e8f9',
      accentMagenta: '#22d3ee',
      themeBand1: 'rgba(103, 232, 249, 0.24)',
      themeBand2: 'rgba(56, 189, 248, 0.20)',
      themeBand3: 'rgba(34, 211, 238, 0.12)'
    },
    'purple-premium': {
      pageAccent: '#c084fc',
      pageAccent2: '#8b5cf6',
      accentPurple: '#c084fc',
      accentCyan: '#8b5cf6',
      accentMagenta: '#e879f9',
      themeBand1: 'rgba(192, 132, 252, 0.26)',
      themeBand2: 'rgba(139, 92, 246, 0.22)',
      themeBand3: 'rgba(232, 121, 249, 0.12)'
    },
    'glass-slate': {
      pageAccent: '#34d399',
      pageAccent2: '#14b8a6',
      accentPurple: '#14b8a6',
      accentCyan: '#34d399',
      accentMagenta: '#2dd4bf',
      themeBand1: 'rgba(52, 211, 153, 0.22)',
      themeBand2: 'rgba(20, 184, 166, 0.19)',
      themeBand3: 'rgba(45, 212, 191, 0.10)'
    },
    'soft-light': {
      pageAccent: '#818cf8',
      pageAccent2: '#38bdf8',
      accentPurple: '#818cf8',
      accentCyan: '#38bdf8',
      accentMagenta: '#a5b4fc',
      themeBand1: 'rgba(129, 140, 248, 0.24)',
      themeBand2: 'rgba(56, 189, 248, 0.18)',
      themeBand3: 'rgba(165, 180, 252, 0.10)'
    }
  };

  constructor(
    private auth: AuthService,
    private router: Router,
    private ui: UiSettingsService
  ) {
    this.sub = this.ui.state$.subscribe((s) => {
      document.body.classList.toggle('dark', !!s.darkMode);
      document.body.classList.toggle('compact', !!s.compactLayout);

      document.body.classList.remove(
        'theme-clean-cyan',
        'theme-purple-premium',
        'theme-glass-slate',
        'theme-soft-light'
      );

      document.body.classList.add(`theme-${s.theme}`);

      this.applyTheme(s.theme, !!s.darkMode);
    });
  }

  ngOnInit(): void {
    this.auth.check();

    this.user$ = this.auth.user$;

    this.hideGlobalDock = this.shouldHideGlobalDock(this.router.url);

    this.sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.hideGlobalDock = this.shouldHideGlobalDock(event.urlAfterRedirects || event.url);
      });

    this.userSub = this.user$.subscribe(user => {
      if (!user) {
        this.dockItems = [];
        return;
      }

      const items: DockItemData[] = [
        {
          icon: '🏠',
          label: 'Home',
          onClick: () => this.router.navigateByUrl('/home')
        },
        {
          icon: '🌟',
          label: 'Favorites',
          onClick: () => this.router.navigateByUrl('/user/favorite')
        },
        {
          icon: '🗂️',
          label: 'MySetup',
          onClick: () => this.router.navigateByUrl('/user/setup')
        },
        {
          icon: '👤',
          label: 'Profile',
          onClick: () => this.router.navigateByUrl('/user/profile')
        },
        {
          icon: '💬',
          label: 'Messages',
          onClick: () => this.router.navigateByUrl('/user/messages')
        },
        {
          icon: '⚙️',
          label: 'Settings',
          onClick: () => this.router.navigateByUrl('/settings')
        }
      ];

      if (['admin', 'admin+', 'owner'].includes(user.role)) {
        items.push({
          icon: '🛡',
          label: 'Admin',
          onClick: () => this.router.navigateByUrl('/user/admin')
        });
      }

      this.dockItems = items;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  private shouldHideGlobalDock(url: string): boolean {
    return url.startsWith('/user/setup') || url.startsWith('/user/favorite');
  }

  private applyTheme(theme: UiThemeKey, darkMode: boolean) {
    const root = document.documentElement;
    const body = document.body;
    const palette = this.themePalettes[theme] || this.themePalettes['glass-slate'];
    const appearance = darkMode ? 'dark' : 'light';

    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);
    root.setAttribute('data-appearance', appearance);
    body.setAttribute('data-appearance', appearance);
    this.applyThemePalette(root, palette);
    this.applyThemePalette(body, palette);
  }

  private applyThemePalette(target: HTMLElement, palette: ThemePalette) {
    target.style.setProperty('--page-accent', palette.pageAccent);
    target.style.setProperty('--page-accent-2', palette.pageAccent2);
    target.style.setProperty('--accent-purple', palette.accentPurple);
    target.style.setProperty('--accent-cyan', palette.accentCyan);
    target.style.setProperty('--accent-magenta', palette.accentMagenta);
    target.style.setProperty('--theme-band-1', palette.themeBand1);
    target.style.setProperty('--theme-band-2', palette.themeBand2);
    target.style.setProperty('--theme-band-3', palette.themeBand3);
  }
}
