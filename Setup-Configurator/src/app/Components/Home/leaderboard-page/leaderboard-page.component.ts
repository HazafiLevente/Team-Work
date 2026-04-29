import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LeaderboardService } from '../../../Models/Leaderboard/leaderboard.service';
import { LeaderboardUser } from '../../../Models/leaderboard-user.model';
import { AuthService } from '../../Services/Auth/auth.service';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrls: ['./leaderboard-page.component.css']
})
export class LeaderboardPageComponent implements OnInit, OnDestroy {
  users: LeaderboardUser[] = [];
  filteredUsers: LeaderboardUser[] = [];
  loading = true;
  error = '';
  searchTerm = '';

  currentUsername = '';
  private userSub?: Subscription;

  constructor(
    private leaderboardService: LeaderboardService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.bindCurrentUser();
    this.loadLeaderboard();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  bindCurrentUser(): void {
    this.userSub = this.auth.user$.subscribe((user: any) => {
      this.currentUsername =
        user?.username ||
        user?.UserName ||
        user?.user?.username ||
        user?.user?.UserName ||
        '';
    });


    this.auth.check();
  }

  loadLeaderboard(): void {
    this.loading = true;
    this.error = '';

    this.leaderboardService.getLeaderboard().subscribe({
      next: (data: LeaderboardUser[]) => {
        this.users = (data || []).sort(
          (a: LeaderboardUser, b: LeaderboardUser) => b.points - a.points
        );
        this.filteredUsers = [...this.users];
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error('Leaderboard load error:', err);
        this.error = 'Nem sikerült betölteni a ranglistát.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  displayName(user: LeaderboardUser): string {
    if (user.fullname?.trim()) return user.fullname.trim();
    if (user.username?.trim()) return user.username.trim();
    return 'Ismeretlen felhasználó';
  }

  trackByUser(index: number, user: LeaderboardUser): number {
    return user.id;
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filteredUsers = this.users.filter((user) => {
      const fullname = (user.fullname || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      return fullname.includes(term) || username.includes(term);
    });
  }

  getPlace(user: LeaderboardUser): number {
    return this.users.findIndex((u) => u.id === user.id) + 1;
  }

  isCurrentUser(user: LeaderboardUser): boolean {
    return !!this.currentUsername &&
      (user.username || '').trim().toLowerCase() === this.currentUsername.trim().toLowerCase();
  }

  getCurrentUser(): LeaderboardUser | undefined {
    return this.users.find((u) => this.isCurrentUser(u));
  }

  getMedal(place: number): string {
    if (place === 1) return '🥇';
    if (place === 2) return '🥈';
    if (place === 3) return '🥉';
    return `#${place}`;
  }

  getRowClasses(user: LeaderboardUser): string[] {
    const place = this.getPlace(user);
    const classes: string[] = [];

    if (place === 1) classes.push('top1');
    if (place === 2) classes.push('top2');
    if (place === 3) classes.push('top3');
    if (this.isCurrentUser(user)) classes.push('me');

    return classes;
  }

  getProgressPercent(user: LeaderboardUser): number {
    const min = Number(user.currentMinPoints ?? 0);
    const max = Number(user.currentMaxPoints ?? 0);
    const points = Number(user.points ?? 0);

    const range = max - min;
    if (range <= 0) return user.pointsToNextRank === 0 ? 100 : 0;

    const raw = ((points - min) / range) * 100;
    return Math.max(0, Math.min(100, raw));
  }

  getProgressLabel(user: LeaderboardUser): string {
    if (user.pointsToNextRank === 0) {
      return 'Max szint';
    }

    return `${Math.round(this.getProgressPercent(user))}%`;
  }
}
