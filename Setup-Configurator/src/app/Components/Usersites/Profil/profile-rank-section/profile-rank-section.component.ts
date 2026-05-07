import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RankPanelComponent } from '../../../Rank-Panel/rank-panel.component';

@Component({
  selector: 'app-profile-rank-section',
  standalone: true,
  imports: [CommonModule, RankPanelComponent],
  templateUrl: './profile-rank-section.component.html',
  styleUrls: ['./profile-rank-section.component.css']
})
export class ProfileRankSectionComponent {
  constructor(private router: Router) {}

  openLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }
}
