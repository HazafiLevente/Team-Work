import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanComponent } from '../plan/plan.component';

@Component({
  selector: 'app-plan-mobile',
  standalone: true,
  imports: [CommonModule, PlanComponent],
  template: `<app-plan [fixedLayout]="'mobile'"></app-plan>`
})
export class PlanMobileComponent {}

