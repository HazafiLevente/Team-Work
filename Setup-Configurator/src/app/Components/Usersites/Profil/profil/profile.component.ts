import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileRankSectionComponent } from '../profile-rank-section/profile-rank-section.component';
import { ProfileInfoSectionComponent } from '../profile-info/profile-info.component';
import { ProfileSecuritySectionComponent } from '../profile-security-section/profile-security-section.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../Services/Auth/auth.service';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ProfileRankSectionComponent,
    ProfileInfoSectionComponent,
    ProfileSecuritySectionComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  publicProfileId: number | null = null;
  publicProfile: any = null;
  publicProfileLoading = false;
  publicProfileError = '';
  profileSummaryLoading = false;
  profileSummaryError = '';
  setupSummary = {
    regular: [] as any[],
    favorites: [] as any[],
    notes: [] as any[],
    lists: [] as any[]
  };
  totalSetupPrice = 0;

  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.sub.add(
      combineLatest([
        this.route.paramMap,
        this.auth.user$
      ]).subscribe(([params, currentUser]) => {
        const nameInUrl = params.get('name');

        if (!nameInUrl) {
          if (currentUser) {
            const myName = this.auth.formatNameForUrl(currentUser.fullname || currentUser.username);
            this.router.navigate(['/user/profile', myName], { replaceUrl: true });
          } else {
            this.publicProfileId = null;
            this.publicProfile = null;
            this.publicProfileError = '';
            this.publicProfileLoading = false;
            this.loadOwnSetupSummary();
          }
          return;
        }

        // If we have a name in URL, check if it's "me" or someone else
        const formattedMyName = currentUser ? this.auth.formatNameForUrl(currentUser.fullname || currentUser.username) : null;

        if (formattedMyName && nameInUrl.toLowerCase() === formattedMyName.toLowerCase()) {
          // It's me
          this.publicProfileId = null;
          this.publicProfile = null; // Clear public profile to show "My Profile" sections
          this.loadOwnSetupSummary();
        } else {
          // It's someone else (or we are not logged in)
          this.publicProfileId = 1; // Any truthy value to switch template
          this.loadPublicProfileByName(nameInUrl);
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  profileInitial(): string {
    const name = this.publicProfile?.user?.name || this.publicProfile?.user?.username || '?';
    return String(name).charAt(0).toUpperCase();
  }

  goBack() {
    this.router.navigate(['/user/messages']);
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('hu-HU').format(Math.round(Number(value) || 0)) + ' Ft';
  }

  totalTrackedItems(): number {
    const listedIds = new Set<number>();
    for (const list of this.setupSummary.lists || []) {
      for (const setup of list.setups || []) {
        const id = Number(setup?.id);
        if (Number.isFinite(id)) listedIds.add(id);
      }
    }
    return listedIds.size + this.setupSummary.notes.length;
  }

  privacyIcon(isSecret: boolean): string {
    return isSecret ? '🔒' : '🔓';
  }

  private loadOwnSetupSummary() {
    if (this.profileSummaryLoading) return;
    this.profileSummaryLoading = true;
    this.profileSummaryError = '';

    this.http.get<any>('/api/profile', { withCredentials: true }).subscribe({
      next: (profile) => {
        const summary = profile?.setupSummary || {};
        this.setupSummary = {
          regular: Array.isArray(summary.regular) ? summary.regular : [],
          favorites: Array.isArray(summary.favorites) ? summary.favorites : [],
          notes: Array.isArray(summary.notes) ? summary.notes : [],
          lists: Array.isArray(summary.lists) ? summary.lists : []
        };
        this.totalSetupPrice = Number(profile?.totalSetupPrice || 0);
        this.profileSummaryLoading = false;
      },
      error: (err) => {
        this.profileSummaryLoading = false;
        this.profileSummaryError = err?.error?.error || 'Nem sikerült betölteni a setup összesítőt.';
      }
    });
  }

  private loadPublicProfileByName(name: string) {
    if (this.publicProfileLoading) return;
    this.publicProfileLoading = true;
    this.publicProfileError = '';
    this.publicProfile = null;

    this.http.get<any>(`/api/users/by-name/${name}/profile`, { withCredentials: true }).subscribe({
      next: (profile) => {
        this.publicProfile = {
          user: profile?.user || {},
          mySetups: Array.isArray(profile?.mySetups) ? profile.mySetups : []
        };
        this.publicProfileLoading = false;
      },
      error: (err) => {
        this.publicProfileLoading = false;
        this.publicProfileError = err.error?.error || 'Nem sikerült betölteni a profilt.';
      }
    });
  }

  private loadPublicProfile(userId: number) {
    this.publicProfileLoading = true;
    this.publicProfileError = '';
    this.publicProfile = null;

    this.http.get<any>(`/api/users/${userId}/profile`, { withCredentials: true }).subscribe({
      next: (profile) => {
        this.publicProfile = {
          user: profile?.user || {},
          mySetups: Array.isArray(profile?.mySetups) ? profile.mySetups : []
        };
        this.publicProfileLoading = false;
      },
      error: (err) => {
        this.publicProfileLoading = false;
        this.publicProfileError = err.error?.error || 'Nem sikerült betölteni a profilt.';
      }
    });
  }
}
