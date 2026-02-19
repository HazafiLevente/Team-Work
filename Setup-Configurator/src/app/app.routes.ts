import { AdminComponent } from './Components/Usersites/Admin/admin/admin.component';
import { adminGuard } from './Components/Auth/authguard/admin.guard';
import { AuthComponent } from './Components/Auth/auth/auth.component';
import { LoginComponent } from './Components/Auth/Login/login.component';
import { RegisterComponent } from './Components/Auth/Register/register.component';
import { HomeComponent } from './Components/Home/home/home.component';
import {authGuard} from './Components/Auth/authguard/auth.guard';
import {UsersiteComponent} from './Components/Usersites/usersite/usersite.component';
import {FavoriteComponent} from './Components/Usersites/Favorite/favorite/favorite.component';
import {SetupComponent} from './Components/Usersites/Setup/setup/setup.component';
import {BellMessageComponent} from './Components/Usersites/Messages/message.component';
import { Routes } from '@angular/router';
import { ProductPageComponent } from './Components/Product/product/product-page.component';
import { ProfileComponent } from './Components/Usersites/Profil/profil/profile.component';
import {UsersComponent} from './Components/Usersites/Admin/users/users.component';
import { SettingsComponent } from './Components/Settings/settings.component';





export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full'},
  { path: 'home', component: HomeComponent }, //{, canActivate: [authGuard] },
  { path: 'product-site/:table/:id', component: ProductPageComponent },
  { path: 'settings', component: SettingsComponent },

  {
    path: 'user',
    component: UsersiteComponent,
    children: [
      { path: 'profile', component: ProfileComponent },
      { path: 'favorite', component: FavoriteComponent },
      { path: 'setup', component: SetupComponent },

      { path: 'message/:key', component: BellMessageComponent },

      {
        path: 'admin',
        component: AdminComponent,
        canActivate: [adminGuard],
        children : [
          {path: 'users', component: UsersComponent},
        ]
      },

      { path: '', redirectTo: 'profile', pathMatch: 'full' }
    ]
  },




  {
    path: '',
    component: AuthComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent }
    ]
  },

  { path: '**', redirectTo: 'home' }
];
