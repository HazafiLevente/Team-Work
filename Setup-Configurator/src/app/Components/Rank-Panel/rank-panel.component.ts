import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RankService, RankMeDto } from '../Services/User/Ranks/rank.service';
import { ElectricBorderComponent } from '../Shared/Electric-Border/electric-border.component';
import { RANK_COLORS } from '../../Constants/ranks.constants';

@Component({
  selector: 'app-rank-panel',
  standalone: true,
  imports: [CommonModule, ElectricBorderComponent],
  templateUrl: './rank-panel.component.html',
  styleUrls: ['./rank-panel.component.css']
})
export class RankPanelComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  /** ✅ ha true: beágyazott kártya (nincs overlay, nincs X) */
  @Input() embedded = false;

  readonly RANK_COLORS = RANK_COLORS;

  data?: RankMeDto;
  loading = true;

  constructor(private rank: RankService) {}

  ngOnInit() {
    this.rank.me().subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get level() { return this.data?.level ?? 1; }
  get color() { return RANK_COLORS[Math.max(0, Math.min(9, this.level - 1))]; }

  backdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.close.emit();
  }
}
