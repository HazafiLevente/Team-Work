import { Routes } from '@angular/router';
import { AuthComponent } from './Components/Auth/auth/auth.component';
import { LoginComponent } from './Components/Auth/Login/login.component';
import { RegisterComponent } from './Components/Auth/Register/register.component';
import { HomeComponent } from './Components/Home/home/home.component';
import { ProfileComponent } from './Components/Profil/profil/profile.component';
import {authGuard} from './Components/Auth/authguard/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },

  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },

  {
    path: 'auth',
    component: AuthComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent }
    ]
  },

  { path: '**', redirectTo: 'home' }
];
