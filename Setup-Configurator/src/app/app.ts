import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { AuthService } from './Components/Services/Auth/auth.service';
import { UiSettingsService } from './Components/Services/SettingService/ui-settings.service';




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

  constructor(
    private auth: AuthService,
    private router: Router,
    private ui: UiSettingsService
  ) {
    // ✅ SETTINGS APPLY (globál)
    this.sub = this.ui.state$.subscribe((s: any) => {
      document.body.classList.toggle('dark', !!s.darkMode);
      document.body.classList.toggle('compact', !!s.compactLayout);

      // ha később akarsz accentet is:
      // document.documentElement.dataset['accent'] = s.accent || 'purple';
    });
  }

  ngOnInit(): void {
    this.auth.check();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /* -----------------------------
     DOCK
  ----------------------------- */

  dockItems: DockItemData[] = [
    { icon: '🏠', label: 'Home', onClick: () => this.router.navigateByUrl('/home') },
    { icon: '🗂️', label: 'MySetup', onClick: () => this.router.navigateByUrl('/user/setup') },
    { icon: '👤', label: 'Profile', onClick: () => this.router.navigateByUrl('/user/profile') },
    { icon: '⚙️', label: 'Settings', onClick: () => this.router.navigateByUrl('/settings') },
  ];

  private scrollHomeTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
