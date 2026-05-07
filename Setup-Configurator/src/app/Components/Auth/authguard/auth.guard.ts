import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth.service';
import { combineLatest } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return combineLatest([auth.initialized$, auth.user$]).pipe(
    filter(([initialized, _]) => initialized),
    take(1),
    map(([_, user]) => {
      if (user) {
        return true;
      }
      router.navigateByUrl('/auth/login');
      return false;
    })
  );
};
