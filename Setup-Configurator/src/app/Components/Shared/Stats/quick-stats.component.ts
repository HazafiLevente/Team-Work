import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountUpComponent } from './count-up.component';

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  imports: [CommonModule, CountUpComponent],
  templateUrl: './quick-stats.component.html',
  styleUrls: ['./quick-stats.component.css']

})
export class QuickStatsComponent {
  @Input() total = 0;
  @Input() pool = 0;
  @Input() chips: string[] = [];
}
