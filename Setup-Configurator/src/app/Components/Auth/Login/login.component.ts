import { Component } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { AuthService } from "../../Services/Auth/auth.service";
import { take } from "rxjs/operators";
import { CommonModule } from '@angular/common';
import { EmailVerifyComponent } from "./email-verify/email-verify.component";
import { NewPasswordComponent } from "./new-password/new-password.component";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmailVerifyComponent,
    NewPasswordComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  email = "";
  password = "";
  rememberMe = false;
  errorMessage = "";

  mode: 'login' | 'emailVerify' | 'newPassword' = 'login';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.errorMessage = "";

    this.auth.login({
      email: this.email,
      password: this.password,
      rememberMe: this.rememberMe
    })
      .pipe(take(1))
      .subscribe({
        next: (user) => {
          if (!user) {
            this.errorMessage = "Hibás email vagy jelszó!";
            return;
          }
          this.router.navigateByUrl('/home');
        },
        error: (err) => {
          if (err.status === 401) {
            this.errorMessage = "Hibás email vagy jelszó!";
          } else {
            this.errorMessage = "Szerver hiba. Próbáld újra.";
          }
        }
      });
  }

  showForgotPassword() {
    this.mode = 'emailVerify';
  }

  resetEmail = "";

  handleCodeSent(email: string) {
    this.resetEmail = email;     // ✅ itt eltesszük
    this.mode = 'newPassword';
  }

  backToLogin() {
    this.mode = 'login';
    this.errorMessage = '';
    this.resetEmail = '';
  }
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  afterResetFromLogin() {
    this.mode = 'login';
    this.router.navigateByUrl('/home');
  }
}
