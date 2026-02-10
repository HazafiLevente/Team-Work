import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from './Components/Services/Auth/auth.service';
import { HeaderComponent } from './Components/header/header.component';
import { DarkVeilBgComponent } from './Components/Shared/Background/dark-veil-bg.component';
import { ClickSparkComponent } from './Components/Shared/Effects/click-spark/click-spark.component';
import { DockComponent, DockItemData } from './Components/Shared/Dock/dock.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    RouterOutlet,
    DarkVeilBgComponent,
    ClickSparkComponent,
    DockComponent
  ],
  templateUrl: './app.html'
})
export class App implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.check();
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
    // ha route-olni is akarsz Home-ra előtte:
    // this.router.navigateByUrl('/home').then(() => ...)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
