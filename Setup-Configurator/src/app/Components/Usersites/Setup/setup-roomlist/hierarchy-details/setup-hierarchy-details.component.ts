import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-setup-hierarchy-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-hierarchy-details.component.html',
  styleUrls: ['./setup-hierarchy-details.component.css']
})
export class SetupHierarchyDetailsComponent {
  @Input() loading = false;
  @Input() error = '';
  @Input() selection: { kind: 'room' | 'item'; data: any } | null = null;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() details: Array<{ key: string; value: any }> = [];
}
