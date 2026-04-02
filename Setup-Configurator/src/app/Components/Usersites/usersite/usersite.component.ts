import { Component, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth.service';
import { Observable, Subscription, filter } from 'rxjs';
import { UiSettingsService } from '../../Services/SettingService/ui-settings.service';

@Component({
  selector: 'app-usersite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './usersite.component.html',
  styleUrls: ['./usersite.component.css']
})
export class UsersiteComponent implements OnDestroy {
  user$!: Observable<any | null>;

  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    private router: Router,
    private ui: UiSettingsService
  ) {
    this.user$ = this.auth.user$;

    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => this.applyPageFromRoute())
    );

    this.sub.add(
      this.ui.state$.subscribe((s: any) => {
        const theme = this.mapTheme(s?.theme);
        document.body.setAttribute('data-theme', theme);
      })
    );

    this.applyPageFromRoute();
  }

  private applyPageFromRoute() {
    const url = this.router.url;

    let page = 'profile';

    if (url.includes('/messages')) page = 'messages';
    else if (url.includes('/favorite')) page = 'favorite';
    else if (url.includes('/admin')) page = 'admin';
    else if (url.includes('/settings')) page = 'settings';
    else if (url.includes('/notifications')) page = 'notifications';
    else if (url.includes('/profile')) page = 'profile';

    document.body.setAttribute('data-page', page);
  }

  private mapTheme(theme: string): string {
    switch (theme) {
      case 'clean-cyan':
        return 'clean-cyan';
      case 'purple-premium':
        return 'purple-premium';
      case 'glass-slate':
        return 'glass-slate';
      case 'soft-light':
        return 'soft-light';
      default:
        return 'glass-slate';
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
