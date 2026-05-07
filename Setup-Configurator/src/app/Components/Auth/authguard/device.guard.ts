import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment, UrlTree } from '@angular/router';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(max-width: 768px)').matches ?? false;
}

function redirectDesktopToMobile(router: Router, segments: readonly UrlSegment[]): UrlTree {
  const url = '/' + segments.map(s => s.path).join('/');
  return router.parseUrl(url.replace('/desktop', '/mobile'));
}

/**
 * Blocks any "desktop" routes on mobile and redirects to "mobile".
 * Used as canMatch so the desktop component won't even load on mobile.
 */
export const noDesktopOnMobileGuard: CanMatchFn = (_route, segments) => {
  const router = inject(Router);

  if (!isMobileViewport()) return true;

  const joined = '/' + segments.map(s => s.path).join('/');
  if (joined.includes('/desktop')) {
    return redirectDesktopToMobile(router, segments);
  }

  return true;
};

