import { Routes } from '@angular/router';
import { adminGuard } from './Components/Auth/authguard/admin.guard';

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
  {
    path: 'settings',
    loadComponent: () => import('./Components/Settings/settings.component')
      .then(m => m.SettingsComponent)
  },
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
        loadComponent: () => import('./Components/Usersites/Plan/plan/plan.component')
          .then(m => m.PlanComponent)
      },
      {
        path: 'plan/:roomId',
        loadComponent: () => import('./Components/Usersites/Plan/plan/plan.component')
          .then(m => m.PlanComponent)
      },
      { path: 'favorite', redirectTo: 'plan', pathMatch: 'full' },
      { path: 'favorite/:roomId', redirectTo: 'plan/:roomId', pathMatch: 'full' },
      {
        path: 'setup',
        loadComponent: () => import('./Components/Usersites/Setup/setup/setup.component')
          .then(m => m.SetupComponent)
      },
      {
        path: 'setup/:roomId',
        loadComponent: () => import('./Components/Usersites/Setup/setup/setup.component')
          .then(m => m.SetupComponent)
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
