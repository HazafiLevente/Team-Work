import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, Observable } from 'rxjs';

import { AuthService } from './Components/Services/Auth/auth.service';
import { UiSettingsService, UiThemeKey } from './Components/Services/SettingService/ui-settings.service';

import { HeaderComponent } from './Components/header/header.component';
import { DarkVeilBgComponent } from './Components/Shared/Background/dark-veil-bg.component';
import { ClickSparkComponent } from './Components/Shared/Effects/click-spark/click-spark.component';
import { DockComponent, DockItemData } from './Components/Shared/Dock/dock.component';
import { MessageButtonComponent } from './Components/Shared/Messages/messages-button/messages.button.component';
import { MessagesPanelComponent } from './Components/Shared/Messages/messages-panel/messages.panel.component';

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

      this.applyTheme(s.theme);
    });
  }

  ngOnInit(): void {
    this.auth.check();

    this.user$ = this.auth.user$;

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

  private applyTheme(theme: UiThemeKey) {
    const root = document.documentElement;

    root.setAttribute('data-theme', theme);

    switch (theme) {
      case 'clean-cyan':
        root.style.setProperty('--page-accent', '#67e8f9');
        root.style.setProperty('--page-accent-2', '#38bdf8');
        root.style.setProperty('--surface', 'rgba(8, 16, 24, 0.72)');
        root.style.setProperty('--glass-alpha', 'rgba(255,255,255,0.04)');
        root.style.setProperty('--glass-border', 'rgba(255,255,255,0.10)');
        root.style.setProperty('--text', '#f4f8ff');
        root.style.setProperty('--muted', 'rgba(244,248,255,0.68)');
        root.style.setProperty('--accent-purple', '#38bdf8');
        root.style.setProperty('--accent-cyan', '#67e8f9');
        break;

      case 'purple-premium':
        root.style.setProperty('--page-accent', '#c084fc');
        root.style.setProperty('--page-accent-2', '#8b5cf6');
        root.style.setProperty('--surface', 'rgba(18, 10, 30, 0.74)');
        root.style.setProperty('--glass-alpha', 'rgba(255,255,255,0.04)');
        root.style.setProperty('--glass-border', 'rgba(255,255,255,0.10)');
        root.style.setProperty('--text', '#f7f2ff');
        root.style.setProperty('--muted', 'rgba(247,242,255,0.66)');
        root.style.setProperty('--accent-purple', '#c084fc');
        root.style.setProperty('--accent-cyan', '#8b5cf6');
        break;

      case 'glass-slate':
        root.style.setProperty('--page-accent', '#34d399');
        root.style.setProperty('--page-accent-2', '#14b8a6');
        root.style.setProperty('--surface', 'rgba(12, 20, 24, 0.62)');
        root.style.setProperty('--glass-alpha', 'rgba(255,255,255,0.05)');
        root.style.setProperty('--glass-border', 'rgba(255,255,255,0.10)');
        root.style.setProperty('--text', '#f3fbf8');
        root.style.setProperty('--muted', 'rgba(243,251,248,0.66)');
        root.style.setProperty('--accent-purple', '#14b8a6');
        root.style.setProperty('--accent-cyan', '#34d399');
        break;

      case 'soft-light':
        root.style.setProperty('--page-accent', '#818cf8');
        root.style.setProperty('--page-accent-2', '#38bdf8');
        root.style.setProperty('--surface', 'rgba(20, 24, 36, 0.78)');
        root.style.setProperty('--glass-alpha', 'rgba(255,255,255,0.06)');
        root.style.setProperty('--glass-border', 'rgba(255,255,255,0.12)');
        root.style.setProperty('--text', '#eef4ff');
        root.style.setProperty('--muted', 'rgba(238,244,255,0.70)');
        root.style.setProperty('--accent-purple', '#818cf8');
        root.style.setProperty('--accent-cyan', '#38bdf8');
        break;
    }
  }
}
