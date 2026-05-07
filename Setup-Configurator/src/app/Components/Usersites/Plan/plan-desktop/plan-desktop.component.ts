import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanComponent } from '../plan/plan.component';

@Component({
  selector: 'app-plan-desktop',
  standalone: true,
  imports: [CommonModule, PlanComponent],
  template: `<app-plan [fixedLayout]="'desktop'"></app-plan>`
})
export class PlanDesktopComponent {}

