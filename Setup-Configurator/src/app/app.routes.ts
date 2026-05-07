import { Routes } from '@angular/router';
import { adminGuard } from './Components/Auth/authguard/admin.guard';
import { noDesktopOnMobileGuard } from './Components/Auth/authguard/device.guard';

export const routes: Routes = [
  {
    path: 'leaderboard',
    loadComponent: () => import('./Components/Home/leaderboard-page/leaderboard-page.component')
      .then(m => m.LeaderboardPageComponent)
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./Components/Home/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'product-open/:name',
    loadComponent: () => import('./Components/Product/product-open/product-open.component')
      .then(m => m.ProductOpenComponent)
  },
  {
    path: 'product-site/:table/:id',
    loadComponent: () => import('./Components/Product/product/product-page.component')
      .then(m => m.ProductPageComponent)
  },
  { path: 'settings', redirectTo: 'user/settings', pathMatch: 'full' },
  {
    path: 'user',
    loadComponent: () => import('./Components/Usersites/usersite/usersite.component')
      .then(m => m.UsersiteComponent),
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./Components/Usersites/Profil/profil/profile.component')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'profile/:name',
        loadComponent: () => import('./Components/Usersites/Profil/profil/profile.component')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'plan',
        loadComponent: () => import('./Components/Usersites/Plan/plan-entry/plan-entry.component')
          .then(m => m.PlanEntryComponent)
      },
      {
        path: 'plan/desktop',
        loadComponent: () => import('./Components/Usersites/Plan/plan-desktop/plan-desktop.component')
          .then(m => m.PlanDesktopComponent),
        canMatch: [noDesktopOnMobileGuard]
      },
      {
        path: 'plan/desktop/:roomId',
        loadComponent: () => import('./Components/Usersites/Plan/plan-desktop/plan-desktop.component')
          .then(m => m.PlanDesktopComponent),
        canMatch: [noDesktopOnMobileGuard]
      },
      {
        path: 'plan/mobile',
        loadComponent: () => import('./Components/Usersites/Plan/plan-mobile/plan-mobile.component')
          .then(m => m.PlanMobileComponent)
      },
      {
        path: 'plan/mobile/:roomId',
        loadComponent: () => import('./Components/Usersites/Plan/plan-mobile/plan-mobile.component')
          .then(m => m.PlanMobileComponent)
      },
      {
        path: 'plan/:roomId',
        loadComponent: () => import('./Components/Usersites/Plan/plan-entry/plan-entry.component')
          .then(m => m.PlanEntryComponent)
      },
      { path: 'favorite', redirectTo: 'plan', pathMatch: 'full' },
      { path: 'favorite/:roomId', redirectTo: 'plan/:roomId', pathMatch: 'full' },
      {
        path: 'setup',
        loadComponent: () => import('./Components/Usersites/Setup/setup-entry/setup-entry.component')
          .then(m => m.SetupEntryComponent)
      },
      {
        path: 'setup/desktop',
        loadComponent: () => import('./Components/Usersites/Setup/setup-desktop/setup-desktop.component')
          .then(m => m.SetupDesktopComponent),
        canMatch: [noDesktopOnMobileGuard]
      },
      {
        path: 'setup/desktop/:roomId',
        loadComponent: () => import('./Components/Usersites/Setup/setup-desktop/setup-desktop.component')
          .then(m => m.SetupDesktopComponent),
        canMatch: [noDesktopOnMobileGuard]
      },
      {
        path: 'setup/mobile',
        loadComponent: () => import('./Components/Usersites/Setup/setup-mobile/setup-mobile.component')
          .then(m => m.SetupMobileComponent)
      },
      {
        path: 'setup/mobile/:roomId',
        loadComponent: () => import('./Components/Usersites/Setup/setup-mobile/setup-mobile.component')
          .then(m => m.SetupMobileComponent)
      },
      {
        path: 'setup/:roomId',
        loadComponent: () => import('./Components/Usersites/Setup/setup-entry/setup-entry.component')
          .then(m => m.SetupEntryComponent)
      },
      {
        path: 'messages',
        loadComponent: () => import('./Components/Usersites/Messages/message.component')
          .then(m => m.MessagesComponent)
      },
      {
        path: 'messages/:key',
        loadComponent: () => import('./Components/Usersites/Messages/message.component')
          .then(m => m.MessagesComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./Components/Settings/settings.component')
          .then(m => m.SettingsComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./Components/Usersites/Admin/admin/admin.component')
          .then(m => m.AdminComponent),
        canActivate: [adminGuard],
        children: [
          {
            path: 'users',
            loadComponent: () => import('./Components/Usersites/Admin/users/users.component')
              .then(m => m.UsersComponent)
          },
        ]
      },
      { path: '', redirectTo: 'profile', pathMatch: 'full' }
    ]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./Components/Notifications/notifications/notifications-page.component')
      .then(m => m.NotificationsPageComponent)
  },
  {
    path: '',
    loadComponent: () => import('./Components/Auth/auth/auth.component')
      .then(m => m.AuthComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./Components/Auth/Login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./Components/Auth/Register/register.component')
          .then(m => m.RegisterComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'home' }
];
