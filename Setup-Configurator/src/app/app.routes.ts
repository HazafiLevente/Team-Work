import { Routes } from '@angular/router';
import { AuthComponent } from './Components/Auth/auth/auth.component';
import { LoginComponent } from './Components/Auth/Login/login.component';
import { RegisterComponent } from './Components/Auth/Register/register.component';
import { HomeComponent } from './Components/Home/home/home.component';
import { ProfileComponent } from './Components/Usersites/Profil/profil/profile.component';
import {authGuard} from './Components/Auth/authguard/auth.guard';
import {UsersiteComponent} from './Components/Usersites/usersite/usersite.component';
import {FavoriteComponent} from './Components/Usersites/Favorite/favorite/favorite.component';
import {SetupComponent} from './Components/Usersites/Setup/setup/setup.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },

  {
    path: 'usersite',
    component: UsersiteComponent,
    canActivate: [authGuard],
    children: [
      { path: 'profile', component: ProfileComponent },
      { path: 'favorite', component: FavoriteComponent },
      { path: 'setup', component: SetupComponent },
      { path: '', redirectTo: 'profile', pathMatch: 'full' }
    ]
  },


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
