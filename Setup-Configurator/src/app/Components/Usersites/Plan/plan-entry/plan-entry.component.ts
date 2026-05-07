import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(max-width: 768px)').matches ?? false;
}

@Component({
  standalone: true,
  selector: 'app-plan-entry',
  template: ''
})
export class PlanEntryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    const base = isMobileViewport() ? 'mobile' : 'desktop';
    const target = roomId ? `/user/plan/${base}/${roomId}` : `/user/plan/${base}`;
    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}

