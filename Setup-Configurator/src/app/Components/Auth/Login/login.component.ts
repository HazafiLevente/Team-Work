import { Component, AfterViewInit } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { take } from "rxjs/operators";

import { AuthService } from "../../Services/Auth/auth.service";
import { EmailVerifyComponent } from "./email-verify/email-verify.component";
import { NewPasswordComponent } from "./new-password/new-password.component";

declare const google: any;

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
export class LoginComponent implements AfterViewInit {

  email = "";
  password = "";
  rememberMe = false;
  errorMessage = "";

  mode: 'login' | 'emailVerify' | 'newPassword' = 'login';
  resetEmail = "";
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    google.accounts.id.initialize({
      client_id: '532912380153-m52bf55o6mh97thupt086j8ift2r4qro.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogle(response)
    });

    google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large" }
    );
  }

  handleGoogle(response: any) {
    if (!response?.credential) {
      this.errorMessage = "Google token hiba";
      return;
    }

    this.auth.googleLogin(response.credential)
      .pipe(take(1))
      .subscribe({
        next: () => this.router.navigateByUrl('/home'),
        error: () => this.errorMessage = "Google login hiba"
      });
  }

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
        error: () => {
          this.errorMessage = "Szerver hiba. Próbáld újra.";
        }
      });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  showForgotPassword() {
    this.mode = 'emailVerify';
  }

  handleCodeSent(email: string) {
    this.resetEmail = email;
    this.mode = 'newPassword';
  }

  backToLogin() {
    this.mode = 'login';
    this.errorMessage = '';
    this.resetEmail = '';
  }

  afterResetFromLogin() {
    this.mode = 'login';
    this.router.navigateByUrl('/home');
  }
}
